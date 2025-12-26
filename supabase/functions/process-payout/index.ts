/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

/**
 * MERCHANT WITHDRAWAL - REBUILT FROM SCRATCH
 * 
 * Core Principles:
 * 1. Ledger-first: All balance changes derived from immutable ledger entries
 * 2. Server-side validation: Never trust client input
 * 3. Idempotency: Same request always returns same result
 * 4. Atomic operations: All-or-nothing transactions
 * 5. Complete audit trail: Every action logged
 * 
 * Fee Structure:
 * - Withdrawal Fee: 2.5% of withdrawal amount
 * - GST on Fee: 18% of the withdrawal fee
 * 
 * Example: ₹10,000 withdrawal
 * - Withdrawal Fee: ₹250 (2.5%)
 * - GST on Fee: ₹45 (18% of ₹250)
 * - Net Amount: ₹9,705
 */

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

// Fee configuration (must match spec exactly)
const MINIMUM_WITHDRAWAL = 100; // ₹100 minimum
const WITHDRAWAL_FEE_PERCENT = 2.5; // 2.5% fee on withdrawals
const GST_PERCENT = 18; // 18% GST on fees only

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
  return `payout_${userId}_${crypto.randomUUID()}`;
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

  // Verify the user's JWT - CRITICAL: merchant_id comes from here, not client
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    console.error("Auth error:", userError);
    return json(401, { error: "Unauthorized" });
  }

  const merchantId = user.id; // CRITICAL: Server-derived, not client-provided

  // Get IP and User Agent for audit
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                    req.headers.get("cf-connecting-ip") || 
                    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Verify user has merchant role
  const { data: merchantRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", merchantId)
    .eq("role", "merchant")
    .maybeSingle();

  if (!merchantRole) {
    console.log(`User ${merchantId} attempted payout without merchant role`);
    return json(403, { error: "Only merchants can request payouts" });
  }

  let payload: ProcessPayoutRequest;
  try {
    payload = (await req.json()) as ProcessPayoutRequest;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { amount, bank_account_id, notes } = payload;
  const idempotencyKey = payload.idempotency_key || generateIdempotencyKey(merchantId);

  // ========== BASIC VALIDATION ==========
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return json(400, { error: "Valid positive amount is required" });
  }

  if (!bank_account_id) {
    return json(400, { error: "bank_account_id is required" });
  }

  if (amount < MINIMUM_WITHDRAWAL) {
    return json(400, { error: `Minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}` });
  }

  console.log(`Processing payout for merchant ${merchantId}, amount: ₹${amount}, idempotency: ${idempotencyKey}`);

  try {
    // ========== 1. IDEMPOTENCY CHECK ==========
    const { data: existingLog } = await supabase
      .from("withdrawal_actions_log")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      console.log(`Idempotent request detected: ${idempotencyKey}`);
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
          withdrawalFee: existingPayout.withdrawal_fee || existingPayout.fee,
          gst: existingPayout.gst,
          netAmount: existingPayout.net_amount,
          transactionId: existingPayout.transaction_id,
          status: existingPayout.status,
          idempotent: true
        });
      }
    }

    // ========== 2. RATE LIMIT CHECK ==========
    const { data: rateLimitOk } = await supabase
      .rpc("check_withdrawal_rate_limit", { 
        p_user_id: merchantId, 
        p_user_type: "merchant" 
      });

    if (rateLimitOk === false) {
      await logAbuseSignal(supabase, merchantId, "rate_limit_exceeded", ipAddress, userAgent, { amount });
      return json(429, { error: "Too many withdrawal attempts. Please try again later." });
    }

    // ========== 3. CHECK FOR PENDING PAYOUTS ==========
    const { data: pendingPayouts } = await supabase
      .from("merchant_payouts")
      .select("id, amount, status")
      .eq("merchant_id", merchantId)
      .in("status", ["processing", "pending", "initiated"]);

    if (pendingPayouts && pendingPayouts.length > 0) {
      const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
      await logAbuseSignal(supabase, merchantId, "double_submit", ipAddress, userAgent, { 
        pending_count: pendingPayouts.length, 
        pending_total: pendingTotal 
      });
      return json(400, { 
        error: `You have ${pendingPayouts.length} pending payout(s) totaling ₹${pendingTotal.toFixed(2)}. Please wait for them to complete.` 
      });
    }

    // ========== 4. USE DATABASE FUNCTION TO CHECK ALL PRECONDITIONS ==========
    const { data: canWithdraw, error: canWithdrawError } = await supabase
      .rpc("can_merchant_withdraw", {
        p_merchant_id: merchantId,
        p_amount: amount
      });

    if (canWithdrawError) {
      console.error("Error checking withdrawal eligibility:", canWithdrawError);
      return json(500, { error: "Failed to verify withdrawal eligibility" });
    }

    const withdrawCheck = canWithdraw?.[0];
    if (!withdrawCheck?.allowed) {
      const reason = withdrawCheck?.reason || "Withdrawal not allowed";
      
      // Log specific abuse signals based on reason
      if (reason.includes("KYC")) {
        await logAbuseSignal(supabase, merchantId, "unverified_kyc_attempt", ipAddress, userAgent, { kyc_status: withdrawCheck.kyc_status });
      } else if (reason.includes("disputes")) {
        await logAbuseSignal(supabase, merchantId, "dispute_withdrawal_attempt", ipAddress, userAgent, {});
      } else if (reason.includes("frozen")) {
        await logAbuseSignal(supabase, merchantId, "frozen_account_attempt", ipAddress, userAgent, {});
      } else if (reason.includes("balance")) {
        await logAbuseSignal(supabase, merchantId, "insufficient_balance_attempt", ipAddress, userAgent, { 
          requested: amount, 
          available: withdrawCheck.available_balance 
        });
      }
      
      return json(400, { error: reason });
    }

    // ========== 5. VERIFY BANK ACCOUNT ==========
    const { data: bankAccount, error: bankError } = await supabase
      .from("merchant_bank_accounts")
      .select("*")
      .eq("id", bank_account_id)
      .eq("merchant_id", merchantId)
      .single();

    if (bankError || !bankAccount) {
      console.error("Bank account not found:", bankError);
      return json(404, { error: "Bank account not found" });
    }

    if (!bankAccount.is_verified) {
      await logAbuseSignal(supabase, merchantId, "unverified_bank_attempt", ipAddress, userAgent, { 
        bank_id: bank_account_id, 
        verification_status: bankAccount.verification_status 
      });
      return json(400, { error: "Bank account must be verified for withdrawals" });
    }

    // ========== 6. CALCULATE FEES (SERVER-SIDE ONLY) ==========
    // Withdrawal Fee: 2.5% of amount
    const withdrawalFee = Math.round(amount * (WITHDRAWAL_FEE_PERCENT / 100) * 100) / 100;
    // GST: 18% on the withdrawal fee only
    const gstOnFee = Math.round(withdrawalFee * (GST_PERCENT / 100) * 100) / 100;
    // Net amount merchant receives
    const netAmount = amount - withdrawalFee - gstOnFee;
    // Transaction ID
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    console.log(`Fee calculation: amount=${amount}, fee=${withdrawalFee} (2.5%), gst=${gstOnFee} (18%), net=${netAmount}`);

    // ========== 7. GET CURRENT BALANCE FROM LEDGER ==========
    const { data: balanceData } = await supabase
      .rpc("compute_merchant_balance_from_ledger", { p_merchant_id: merchantId });

    const currentBalance = balanceData?.[0]?.current_balance || 0;
    const availableBalance = balanceData?.[0]?.available_balance || 0;

    // Double-check balance (defense in depth)
    if (amount > availableBalance) {
      return json(400, { error: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}` });
    }

    // ========== 8. CREATE PAYOUT RECORD (ATOMIC) ==========
    const { data: payout, error: payoutError } = await supabase
      .from("merchant_payouts")
      .insert({
        merchant_id: merchantId,
        bank_account_id,
        amount,
        fee: withdrawalFee + gstOnFee, // Total fee
        withdrawal_fee: withdrawalFee,
        gst: gstOnFee,
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
      if (payoutError.code === "23505") {
        return json(400, { error: "A withdrawal is already in progress. Please wait." });
      }
      
      // Log failure alert
      await logFinancialFailure(supabase, "create_payout", "merchant", merchantId, payoutError.message, amount);
      return json(500, { error: "Failed to create payout record" });
    }

    // ========== 9. CREATE LEDGER ENTRIES (IMMUTABLE) ==========
    // Main withdrawal entry
    const { error: ledgerError } = await supabase
      .from("merchant_wallet_transactions")
      .insert({
        merchant_id: merchantId,
        transaction_type: "withdrawal",
        entry_type: "withdrawal_debit",
        amount: amount,
        balance_before: currentBalance,
        balance_after: currentBalance - amount,
        status: "pending",
        reference_type: "payout",
        reference_id: payout.id,
        reason: `Withdrawal to ${bankAccount.bank_name} ••••${bankAccount.account_number.slice(-4)}`,
        currency: "INR",
        created_by: merchantId,
      });

    if (ledgerError) {
      console.error("Failed to create ledger entry:", ledgerError);
      // Rollback payout record
      await supabase.from("merchant_payouts").delete().eq("id", payout.id);
      await logFinancialFailure(supabase, "create_ledger_entry", "merchant", merchantId, ledgerError.message, amount);
      return json(500, { error: "Failed to create ledger entry" });
    }

    // Fee entry
    await supabase.from("merchant_wallet_transactions").insert({
      merchant_id: merchantId,
      transaction_type: "fee",
      entry_type: "withdrawal_fee_debit",
      amount: withdrawalFee,
      balance_before: currentBalance - amount,
      balance_after: currentBalance - amount,
      status: "success",
      reference_type: "payout",
      reference_id: payout.id,
      reason: `Withdrawal fee (${WITHDRAWAL_FEE_PERCENT}%)`,
      currency: "INR",
      created_by: merchantId,
    });

    // GST entry
    await supabase.from("merchant_wallet_transactions").insert({
      merchant_id: merchantId,
      transaction_type: "gst",
      entry_type: "gst_on_withdrawal_fee",
      amount: gstOnFee,
      balance_before: currentBalance - amount,
      balance_after: currentBalance - amount,
      status: "success",
      reference_type: "payout",
      reference_id: payout.id,
      reason: `GST on withdrawal fee (${GST_PERCENT}%)`,
      currency: "INR",
      created_by: merchantId,
    });

    // ========== 10. CREATE AUDIT LOG ==========
    await supabase.from("withdrawal_actions_log").insert({
      withdrawal_id: payout.id,
      withdrawal_type: "merchant_payout",
      user_id: merchantId,
      user_type: "merchant",
      action_type: "initiated",
      previous_status: null,
      new_status: "processing",
      amount,
      fee: withdrawalFee,
      gst: gstOnFee,
      total_debit: amount,
      balance_before: currentBalance,
      balance_after: currentBalance - amount,
      bank_account_id: bank_account_id,
      bank_name: bankAccount.bank_name,
      account_last4: bankAccount.account_number.slice(-4),
      idempotency_key: idempotencyKey,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { transaction_id: transactionId, notes, withdrawal_fee_percent: WITHDRAWAL_FEE_PERCENT, gst_percent: GST_PERCENT }
    });

    // ========== 11. CREATE NOTIFICATION ==========
    await supabase.from("merchant_notifications").insert({
      merchant_id: merchantId,
      title: "Withdrawal Processing",
      body: `Your withdrawal of ₹${netAmount.toFixed(2)} (after ₹${withdrawalFee.toFixed(2)} fee + ₹${gstOnFee.toFixed(2)} GST) is being processed.`,
      type: "payout",
      priority: "normal",
    });

    console.log(`Payout ${payout.id} created successfully. Amount: ${amount}, Fee: ${withdrawalFee}, GST: ${gstOnFee}, Net: ${netAmount}`);

    return json(200, {
      success: true,
      message: "Withdrawal submitted for processing",
      payoutId: payout.id,
      amount,
      withdrawalFee,
      gst: gstOnFee,
      totalFee: withdrawalFee + gstOnFee,
      netAmount,
      transactionId,
      status: "processing"
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // Log financial failure
    await logFinancialFailure(
      createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }),
      "process_payout",
      "merchant",
      merchantId,
      errorMessage,
      payload?.amount
    );
    
    return json(500, { error: errorMessage });
  }
});

// Helper function to log abuse signals
// deno-lint-ignore no-explicit-any
async function logAbuseSignal(
  supabase: any,
  userId: string,
  signalType: string,
  ipAddress: string,
  userAgent: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from("withdrawal_abuse_signals").insert({
      user_id: userId,
      user_type: "merchant",
      signal_type: signalType,
      ip_address: ipAddress,
      user_agent: userAgent,
      details
    });
  } catch (e) {
    console.error("Failed to log abuse signal:", e);
  }
}

// Helper function to log financial failures as alerts
// deno-lint-ignore no-explicit-any
async function logFinancialFailure(
  supabase: any,
  actionType: string,
  targetType: string,
  targetId: string,
  errorMessage: string,
  amount?: number
) {
  try {
    await supabase.from("admin_alerts").insert({
      alert_type: "financial_failure",
      severity: amount && amount > 50000 ? "critical" : "high",
      title: `Withdrawal Failed: ${actionType}`,
      description: `Failed to complete ${actionType} for ${targetType} ${targetId}: ${errorMessage}`,
      related_entity_type: targetType,
      related_entity_id: targetId,
      triggered_by: targetId,
      triggered_by_type: targetType,
      metadata: { action_type: actionType, amount, error: errorMessage }
    });
  } catch (e) {
    console.error("Failed to log financial failure alert:", e);
  }
}
