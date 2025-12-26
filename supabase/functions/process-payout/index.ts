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
}

const MINIMUM_WITHDRAWAL = 100;
const PAYOUT_FEE_PERCENT = 2;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
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

  if (!amount || !bank_account_id) {
    return json(400, { error: "amount and bank_account_id are required" });
  }

  if (amount < MINIMUM_WITHDRAWAL) {
    return json(400, { error: `Minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}` });
  }

  console.log(`Processing payout request for merchant ${user.id}, amount: ₹${amount}`);

  try {
    // 1. Check for pending payouts
    const { data: pendingPayouts, error: pendingError } = await supabase
      .from("merchant_payouts")
      .select("id, amount, status")
      .eq("merchant_id", user.id)
      .eq("status", "processing");

    if (pendingError) {
      console.error("Error checking pending payouts:", pendingError);
      throw pendingError;
    }

    if (pendingPayouts && pendingPayouts.length > 0) {
      const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
      return json(400, { 
        error: `You have ${pendingPayouts.length} pending payout(s) totaling ₹${pendingTotal.toFixed(2)}. Please wait for them to complete.` 
      });
    }

    // 2. Check if escrow is frozen
    const { data: escrowAccount } = await supabase
      .from("escrow_accounts")
      .select("is_frozen")
      .eq("merchant_id", user.id)
      .maybeSingle();

    if (escrowAccount?.is_frozen) {
      return json(400, { error: "Your escrow account is frozen. Please contact support." });
    }

    // 3. Check merchant status
    const { data: merchant } = await supabase
      .from("merchants")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (merchant?.status === "banned" || merchant?.status === "suspended") {
      return json(400, { error: "Your account is suspended. Please contact support." });
    }

    // 4. Fetch wallet with current balance
    const { data: wallet, error: walletError } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", user.id)
      .single();

    if (walletError || !wallet) {
      console.error("Wallet not found:", walletError);
      return json(404, { error: "Wallet not found" });
    }

    if (amount > wallet.available_balance) {
      return json(400, { 
        error: `Insufficient balance. Available: ₹${wallet.available_balance.toFixed(2)}` 
      });
    }

    // 5. Verify bank account is verified
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
      return json(400, { error: "Bank account must be verified for withdrawals" });
    }

    const fee = amount * (PAYOUT_FEE_PERCENT / 100);
    const netAmount = amount - fee;
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // 6. Create payout record FIRST
    const { data: payout, error: payoutError } = await supabase
      .from("merchant_payouts")
      .insert({
        merchant_id: user.id,
        bank_account_id,
        amount,
        fee,
        net_amount: netAmount,
        notes: notes || null,
        status: "processing",
        transaction_id: transactionId,
      })
      .select()
      .single();

    if (payoutError) {
      console.error("Failed to create payout:", payoutError);
      return json(500, { error: "Failed to create payout record" });
    }

    // 7. Create merchant wallet ledger entry (LEDGER-FIRST APPROACH)
    // This will auto-sync the wallet balance via database trigger
    const { error: ledgerError } = await supabase
      .from("merchant_wallet_transactions")
      .insert({
        merchant_id: user.id,
        transaction_type: "withdrawal",
        amount: amount,
        balance_before: wallet.available_balance,
        balance_after: wallet.available_balance - amount,
        status: "pending", // Pending until bank confirms
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

    // Also create fee ledger entry
    if (fee > 0) {
      await supabase
        .from("merchant_wallet_transactions")
        .insert({
          merchant_id: user.id,
          transaction_type: "fee",
          amount: fee,
          balance_before: wallet.available_balance - amount,
          balance_after: wallet.available_balance - amount, // Fee doesn't change balance - it's deducted from payout
          status: "success",
          reference_type: "payout",
          reference_id: payout.id,
          reason: `Withdrawal fee (${PAYOUT_FEE_PERCENT}%)`,
          created_by: user.id,
        });
    }

    console.log(`LEDGER: Withdrawal entry created: -₹${amount}, fee: ₹${fee}`);
    console.log(`Wallet will sync via trigger: available ${wallet.available_balance} -> ${wallet.available_balance - amount}`)

    console.log(`Payout created: ${payout.id}, amount: ₹${amount}, net: ₹${netAmount}`);

    // 8. Create merchant notification
    await supabase
      .from("merchant_notifications")
      .insert({
        merchant_id: user.id,
        title: "Withdrawal Processing",
        body: `Your withdrawal of ₹${netAmount.toFixed(2)} (after ₹${fee.toFixed(2)} fee) is being processed.`,
        type: "payout",
        priority: "normal",
      });

    // 9. In production, this would trigger actual bank transfer via payment gateway
    // For now, we'll mark it as completed after a delay (simulating bank processing)
    // This should be replaced with actual webhook handling from payment provider
    
    console.log(`Payout ${payout.id} submitted for processing`);

    return json(200, {
      success: true,
      message: "Withdrawal submitted for processing",
      payoutId: payout.id,
      amount,
      fee,
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
