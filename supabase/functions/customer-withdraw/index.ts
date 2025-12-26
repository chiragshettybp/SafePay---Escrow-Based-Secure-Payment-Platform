/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerWithdrawRequest {
  amount: number;
  bank_account_id: string;
  idempotency_key?: string;
}

const MINIMUM_WITHDRAWAL = 100;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function generateIdempotencyKey(userId: string): string {
  return `cust_withdraw_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing server configuration");
    return json(500, { error: "Missing server configuration" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "Missing authorization header" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    console.error("Auth error:", userError);
    return json(401, { error: "Unauthorized" });
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                    req.headers.get("cf-connecting-ip") || 
                    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  let payload: CustomerWithdrawRequest;
  try {
    payload = (await req.json()) as CustomerWithdrawRequest;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { amount, bank_account_id } = payload;
  const idempotencyKey = payload.idempotency_key || generateIdempotencyKey(user.id);

  if (!amount || !bank_account_id) {
    return json(400, { error: "amount and bank_account_id are required" });
  }

  if (amount < MINIMUM_WITHDRAWAL) {
    return json(400, { error: `Minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}` });
  }

  if (amount <= 0) {
    return json(400, { error: "Amount must be greater than 0" });
  }

  console.log(`Processing customer withdrawal for ${user.id}, amount: ₹${amount}, idempotency: ${idempotencyKey}`);

  try {
    // ========== IDEMPOTENCY CHECK ==========
    const { data: existingLog } = await supabase
      .from("withdrawal_actions_log")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      console.log(`Idempotent request detected: ${idempotencyKey}`);
      const { data: existingTx } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("id", existingLog.withdrawal_id)
        .single();
      
      if (existingTx) {
        return json(200, {
          success: true,
          message: "Withdrawal already processed (idempotent)",
          transaction: existingTx,
          idempotent: true
        });
      }
    }

    // ========== RATE LIMIT CHECK ==========
    const { data: rateLimitOk } = await supabase
      .rpc("check_withdrawal_rate_limit", { 
        p_user_id: user.id, 
        p_user_type: "customer" 
      });

    if (rateLimitOk === false) {
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "customer",
        signal_type: "rate_limit_exceeded",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { amount, bank_account_id }
      });
      return json(429, { error: "Too many withdrawal attempts. Please try again later." });
    }

    // ========== 1. CHECK FOR PENDING WITHDRAWALS ==========
    const { data: pendingWithdrawals, error: pendingError } = await supabase
      .from("wallet_transactions")
      .select("id, amount")
      .eq("customer_id", user.id)
      .eq("type", "withdrawal")
      .in("status", ["pending", "processing", "initiated"]);

    if (pendingError) {
      console.error("Error checking pending withdrawals:", pendingError);
      throw pendingError;
    }

    if (pendingWithdrawals && pendingWithdrawals.length > 0) {
      const pendingTotal = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "customer",
        signal_type: "double_submit",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { pending_count: pendingWithdrawals.length, pending_total: pendingTotal }
      });
      return json(400, { 
        error: `You have ${pendingWithdrawals.length} pending withdrawal(s) totaling ₹${pendingTotal.toFixed(2)}. Please wait for them to complete.` 
      });
    }

    // ========== 2. CHECK KYC STATUS ==========
    const { data: kycRecord } = await supabase
      .from("kyc_records")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!kycRecord || kycRecord.status !== "approved") {
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "customer",
        signal_type: "unverified_kyc_attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { kyc_status: kycRecord?.status || "not_started" }
      });
      return json(400, { 
        error: `KYC must be approved before withdrawing funds. Current status: ${kycRecord?.status || "not_started"}` 
      });
    }

    // ========== 3. CHECK FOR ACTIVE DISPUTES ==========
    const { data: activeDisputes } = await supabase
      .from("disputes")
      .select("id, order_id, status")
      .eq("customer_id", user.id)
      .in("status", ["open", "under_review", "pending"]);

    if (activeDisputes && activeDisputes.length > 0) {
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "customer",
        signal_type: "dispute_withdrawal_attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { dispute_count: activeDisputes.length, dispute_ids: activeDisputes.map(d => d.id) }
      });
      return json(400, { 
        error: `Cannot withdraw with ${activeDisputes.length} active dispute(s). Resolve all disputes first.` 
      });
    }

    // ========== 4. VERIFY BANK ACCOUNT ==========
    const { data: bankAccount, error: bankError } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("id", bank_account_id)
      .eq("customer_id", user.id)
      .single();

    if (bankError || !bankAccount) {
      console.error("Bank account not found:", bankError);
      return json(404, { error: "Bank account not found" });
    }

    if (bankAccount.verification_status !== "verified") {
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "customer",
        signal_type: "unverified_bank_attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { bank_id: bank_account_id, verification_status: bankAccount.verification_status }
      });
      return json(400, { error: "Bank account must be verified for withdrawals" });
    }

    // ========== 5. FETCH WALLET & VALIDATE BALANCE ==========
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("customer_id", user.id)
      .single();

    if (walletError || !wallet) {
      console.error("Wallet not found:", walletError);
      return json(404, { error: "Wallet not found" });
    }

    // Compute ledger-derived balance for accuracy
    const { data: ledgerBalance } = await supabase
      .rpc("compute_wallet_balance", { p_customer_id: user.id });

    const availableBalance = ledgerBalance ?? wallet.balance;

    if (amount > availableBalance) {
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "customer",
        signal_type: "insufficient_balance_attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { requested: amount, available: availableBalance }
      });
      return json(400, { 
        error: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}` 
      });
    }

    // ========== 6. CREATE WITHDRAWAL TRANSACTION (LEDGER ENTRY) ==========
    const { data: transaction, error: txError } = await supabase
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        customer_id: user.id,
        type: "withdrawal",
        amount,
        description: `Withdrawal to ${bankAccount.bank_name} ••••${bankAccount.account_number.slice(-4)}`,
        status: "pending",
        reference_id: bank_account_id,
        reference_type: "bank_account",
        idempotency_key: idempotencyKey,
        metadata: {
          bank_name: bankAccount.bank_name,
          account_last4: bankAccount.account_number.slice(-4),
          ifsc_code: bankAccount.ifsc_code,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Failed to create withdrawal transaction:", txError);
      // Check for concurrent withdrawal constraint
      if (txError.code === "23505") {
        return json(400, { error: "A withdrawal is already in progress. Please wait." });
      }
      return json(500, { error: "Failed to create withdrawal transaction" });
    }

    // ========== 7. CREATE AUDIT LOG ==========
    await supabase
      .from("withdrawal_actions_log")
      .insert({
        withdrawal_id: transaction.id,
        withdrawal_type: "customer_withdrawal",
        user_id: user.id,
        user_type: "customer",
        action_type: "initiated",
        previous_status: null,
        new_status: "pending",
        amount,
        fee: 0,
        gst: 0,
        total_debit: amount,
        balance_before: availableBalance,
        balance_after: availableBalance - amount,
        bank_account_id: bank_account_id,
        bank_name: bankAccount.bank_name,
        account_last4: bankAccount.account_number.slice(-4),
        idempotency_key: idempotencyKey,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {}
      });

    console.log(`Customer withdrawal created: ${transaction.id}, amount: ₹${amount}`);

    // ========== 8. CREATE NOTIFICATION ==========
    await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "wallet",
        title: "Withdrawal Processing",
        message: `Your withdrawal of ₹${amount.toFixed(2)} is being processed. Funds will be credited within 2-3 business days.`,
      });

    return json(200, {
      success: true,
      message: "Withdrawal submitted for processing",
      transaction,
      status: "pending"
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return json(500, { error: errorMessage });
  }
});
