/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessPayoutRequest {
  amount: number;
  bank_account_id: string;
  notes?: string;
  idempotency_key?: string;
}

const MINIMUM_WITHDRAWAL = 100;
const PAYOUT_FEE_PERCENT = 2;
const GST_PERCENT = 18; // GST on fees

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
  return `payout_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

  // Get user from auth header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "Missing authorization header" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify the user's JWT
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    console.error("Auth error:", userError);
    return json(401, { error: "Unauthorized" });
  }

  // Get IP and User Agent for audit
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                    req.headers.get("cf-connecting-ip") || 
                    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Verify user is a merchant
  const { data: merchantRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "merchant")
    .maybeSingle();

  if (!merchantRole) {
    return json(403, { error: "Only merchants can request payouts" });
  }

  let payload: ProcessPayoutRequest;
  try {
    payload = (await req.json()) as ProcessPayoutRequest;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { amount, bank_account_id, notes } = payload;
  // Generate or use provided idempotency key
  const idempotencyKey = payload.idempotency_key || generateIdempotencyKey(user.id);

  if (!amount || !bank_account_id) {
    return json(400, { error: "amount and bank_account_id are required" });
  }

  if (amount < MINIMUM_WITHDRAWAL) {
    return json(400, { error: `Minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}` });
  }

  console.log(`Processing payout request for merchant ${user.id}, amount: ₹${amount}, idempotency: ${idempotencyKey}`);

  try {
    // ========== IDEMPOTENCY CHECK ==========
    // Check if this request was already processed
    const { data: existingLog } = await supabase
      .from("withdrawal_actions_log")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      console.log(`Idempotent request detected: ${idempotencyKey}`);
      // Return existing payout
      const { data: existingPayout } = await supabase
        .from("merchant_payouts")
        .select("*")
        .eq("id", existingLog.withdrawal_id)
        .single();
      
      if (existingPayout) {
        return json(200, {
          success: true,
          message: "Withdrawal already processed (idempotent)",
          payoutId: existingPayout.id,
          amount: existingPayout.amount,
          fee: existingPayout.fee,
          netAmount: existingPayout.net_amount,
          transactionId: existingPayout.transaction_id,
          status: existingPayout.status,
          idempotent: true
        });
      }
    }

    // ========== RATE LIMIT CHECK ==========
    const { data: rateLimitOk } = await supabase
      .rpc("check_withdrawal_rate_limit", { 
        p_user_id: user.id, 
        p_user_type: "merchant" 
      });

    if (rateLimitOk === false) {
      // Log abuse signal
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "merchant",
        signal_type: "rate_limit_exceeded",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { amount, bank_account_id }
      });
      return json(429, { error: "Too many withdrawal attempts. Please try again later." });
    }

    // ========== 1. CHECK FOR PENDING PAYOUTS ==========
    const { data: pendingPayouts, error: pendingError } = await supabase
      .from("merchant_payouts")
      .select("id, amount, status")
      .eq("merchant_id", user.id)
      .in("status", ["processing", "pending", "initiated"]);

    if (pendingError) {
      console.error("Error checking pending payouts:", pendingError);
      throw pendingError;
    }

    if (pendingPayouts && pendingPayouts.length > 0) {
      const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
      // Log abuse signal for double submit
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "merchant",
        signal_type: "double_submit",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { pending_count: pendingPayouts.length, pending_total: pendingTotal }
      });
      return json(400, { 
        error: `You have ${pendingPayouts.length} pending payout(s) totaling ₹${pendingTotal.toFixed(2)}. Please wait for them to complete.` 
      });
    }

    // ========== 2. CHECK KYC STATUS ==========
    const { data: kycRecord } = await supabase
      .from("merchant_kyc")
      .select("status")
      .eq("merchant_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!kycRecord || kycRecord.status !== "approved") {
      // Log abuse signal
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "merchant",
        signal_type: "unverified_kyc_attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { kyc_status: kycRecord?.status || "not_started" }
      });
      return json(400, { 
        error: `KYC must be approved before withdrawing funds. Current status: ${kycRecord?.status || "not_started"}` 
      });
    }

    // ========== 3. CHECK ESCROW FROZEN STATUS ==========
    const { data: escrowAccount } = await supabase
      .from("escrow_accounts")
      .select("is_frozen")
      .eq("merchant_id", user.id)
      .maybeSingle();

    if (escrowAccount?.is_frozen) {
      // Log abuse signal
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "merchant",
        signal_type: "frozen_account_attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { escrow_frozen: true }
      });
      return json(400, { error: "Your escrow account is frozen. Please contact support." });
    }

    // ========== 4. CHECK FOR ACTIVE DISPUTES ==========
    const { data: activeDisputes, error: disputeError } = await supabase
      .from("disputes")
      .select("id, order_id, status")
      .eq("status", "open")
      .in("status", ["open", "under_review", "pending"]);

    if (!disputeError && activeDisputes) {
      // Filter to disputes for this merchant's orders
      const { data: merchantOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("merchant_id", user.id);

      const merchantOrderIds = merchantOrders?.map(o => o.id) || [];
      const merchantDisputes = activeDisputes.filter(d => merchantOrderIds.includes(d.order_id));

      if (merchantDisputes.length > 0) {
        // Log abuse signal
        await supabase.from("withdrawal_abuse_signals").insert({
          user_id: user.id,
          user_type: "merchant",
          signal_type: "dispute_withdrawal_attempt",
          ip_address: ipAddress,
          user_agent: userAgent,
          details: { dispute_count: merchantDisputes.length, dispute_ids: merchantDisputes.map(d => d.id) }
        });
        return json(400, { 
          error: `Cannot withdraw with ${merchantDisputes.length} active dispute(s). Resolve all disputes first.` 
        });
      }
    }

    // ========== 5. CHECK MERCHANT STATUS ==========
    const { data: merchant } = await supabase
      .from("merchants")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (merchant?.status === "banned" || merchant?.status === "suspended") {
      return json(400, { error: "Your account is suspended. Please contact support." });
    }

    // ========== 6. FETCH WALLET & VALIDATE BALANCE ==========
    const { data: wallet, error: walletError } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", user.id)
      .single();

    if (walletError || !wallet) {
      console.error("Wallet not found:", walletError);
      return json(404, { error: "Wallet not found" });
    }

    // Calculate fees SERVER-SIDE (never trust client)
    const fee = Math.round(amount * (PAYOUT_FEE_PERCENT / 100) * 100) / 100;
    const gst = Math.round(fee * (GST_PERCENT / 100) * 100) / 100;
    const totalDebit = amount; // Full amount debited from wallet
    const netAmount = amount - fee - gst; // Net received by merchant

    if (amount > wallet.available_balance) {
      // Log abuse signal
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "merchant",
        signal_type: "insufficient_balance_attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { requested: amount, available: wallet.available_balance }
      });
      return json(400, { 
        error: `Insufficient balance. Available: ₹${wallet.available_balance.toFixed(2)}` 
      });
    }

    // ========== 7. VERIFY BANK ACCOUNT ==========
    const { data: bankAccount, error: bankError } = await supabase
      .from("merchant_bank_accounts")
      .select("*")
      .eq("id", bank_account_id)
      .eq("merchant_id", user.id)
      .single();

    if (bankError || !bankAccount) {
      console.error("Bank account not found:", bankError);
      return json(404, { error: "Bank account not found" });
    }

    if (!bankAccount.is_verified) {
      // Log abuse signal
      await supabase.from("withdrawal_abuse_signals").insert({
        user_id: user.id,
        user_type: "merchant",
        signal_type: "unverified_bank_attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { bank_id: bank_account_id, verification_status: bankAccount.verification_status }
      });
      return json(400, { error: "Bank account must be verified for withdrawals" });
    }

    const transactionId = `TXN${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    // ========== 8. CREATE PAYOUT RECORD (ATOMIC) ==========
    const { data: payout, error: payoutError } = await supabase
      .from("merchant_payouts")
      .insert({
        merchant_id: user.id,
        bank_account_id,
        amount,
        fee,
        gst,
        net_amount: netAmount,
        notes: notes || null,
        status: "processing",
        transaction_id: transactionId,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (payoutError) {
      console.error("Failed to create payout:", payoutError);
      // Check if unique constraint violation (concurrent withdrawal)
      if (payoutError.code === "23505") {
        return json(400, { error: "A withdrawal is already in progress. Please wait." });
      }
      return json(500, { error: "Failed to create payout record" });
    }

    // ========== 9. CREATE LEDGER ENTRIES ==========
    // Withdrawal entry
    const { error: ledgerError } = await supabase
      .from("merchant_wallet_transactions")
      .insert({
        merchant_id: user.id,
        transaction_type: "withdrawal",
        amount: amount,
        balance_before: wallet.available_balance,
        balance_after: wallet.available_balance - amount,
        status: "pending",
        reference_type: "payout",
        reference_id: payout.id,
        reason: `Withdrawal to ${bankAccount.bank_name} ••••${bankAccount.account_number.slice(-4)}`,
        created_by: user.id,
      });

    if (ledgerError) {
      console.error("Failed to create ledger entry:", ledgerError);
      // Rollback payout record
      await supabase
        .from("merchant_payouts")
        .delete()
        .eq("id", payout.id);
      
      return json(500, { error: "Failed to create ledger entry" });
    }

    // Fee entry
    if (fee > 0) {
      await supabase
        .from("merchant_wallet_transactions")
        .insert({
          merchant_id: user.id,
          transaction_type: "fee",
          amount: fee,
          balance_before: wallet.available_balance - amount,
          balance_after: wallet.available_balance - amount,
          status: "success",
          reference_type: "payout",
          reference_id: payout.id,
          reason: `Withdrawal fee (${PAYOUT_FEE_PERCENT}%)`,
          created_by: user.id,
        });
    }

    // GST entry
    if (gst > 0) {
      await supabase
        .from("merchant_wallet_transactions")
        .insert({
          merchant_id: user.id,
          transaction_type: "gst",
          amount: gst,
          balance_before: wallet.available_balance - amount,
          balance_after: wallet.available_balance - amount,
          status: "success",
          reference_type: "payout",
          reference_id: payout.id,
          reason: `GST on withdrawal fee (${GST_PERCENT}%)`,
          created_by: user.id,
        });
    }

    // ========== 10. CREATE AUDIT LOG ==========
    await supabase
      .from("withdrawal_actions_log")
      .insert({
        withdrawal_id: payout.id,
        withdrawal_type: "merchant_payout",
        user_id: user.id,
        user_type: "merchant",
        action_type: "initiated",
        previous_status: null,
        new_status: "processing",
        amount,
        fee,
        gst,
        total_debit: totalDebit,
        balance_before: wallet.available_balance,
        balance_after: wallet.available_balance - amount,
        bank_account_id: bank_account_id,
        bank_name: bankAccount.bank_name,
        account_last4: bankAccount.account_number.slice(-4),
        idempotency_key: idempotencyKey,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { transaction_id: transactionId, notes }
      });

    console.log(`LEDGER: Withdrawal entry created: -₹${amount}, fee: ₹${fee}, gst: ₹${gst}`);
    console.log(`Wallet will sync via trigger: available ${wallet.available_balance} -> ${wallet.available_balance - amount}`);

    // ========== 11. CREATE NOTIFICATION ==========
    await supabase
      .from("merchant_notifications")
      .insert({
        merchant_id: user.id,
        title: "Withdrawal Processing",
        body: `Your withdrawal of ₹${netAmount.toFixed(2)} (after ₹${fee.toFixed(2)} fee + ₹${gst.toFixed(2)} GST) is being processed.`,
        type: "payout",
        priority: "normal",
      });

    console.log(`Payout ${payout.id} submitted for processing`);

    return json(200, {
      success: true,
      message: "Withdrawal submitted for processing",
      payoutId: payout.id,
      amount,
      fee,
      gst,
      netAmount,
      transactionId,
      status: "processing"
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return json(500, { error: errorMessage });
  }
});
