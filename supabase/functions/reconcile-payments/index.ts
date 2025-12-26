/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReconciliationResult {
  orphanPayments: Array<{
    paymentId: string;
    orderId: string;
    amount: number;
    status: string;
    createdAt: string;
    issue: string;
  }>;
  orphanEscrows: Array<{
    transactionId: string;
    orderId: string;
    amount: number;
    createdAt: string;
    issue: string;
  }>;
  amountMismatches: Array<{
    paymentId: string;
    orderId: string;
    paymentAmount: number;
    escrowAmount: number;
    difference: number;
  }>;
  duplicateEscrows: Array<{
    orderId: string;
    creditCount: number;
    totalCredited: number;
  }>;
  autoFixed: Array<{
    type: string;
    id: string;
    action: string;
  }>;
  summary: {
    totalPayments: number;
    totalEscrowCredits: number;
    orphanPaymentsCount: number;
    orphanEscrowsCount: number;
    mismatchesCount: number;
    duplicatesCount: number;
    autoFixedCount: number;
  };
}

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

  // Verify the user's JWT and check for admin role
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    console.error("Auth error:", userError);
    return json(401, { error: "Unauthorized" });
  }

  // Check if user is admin
  const { data: adminCheck } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!adminCheck) {
    return json(403, { error: "Admin access required" });
  }

  let autoFix = false;
  try {
    const body = await req.json();
    autoFix = body?.autoFix === true;
  } catch {
    // No body or invalid JSON, proceed with read-only mode
  }

  console.log(`Running payment reconciliation (autoFix: ${autoFix})`);

  const result: ReconciliationResult = {
    orphanPayments: [],
    orphanEscrows: [],
    amountMismatches: [],
    duplicateEscrows: [],
    autoFixed: [],
    summary: {
      totalPayments: 0,
      totalEscrowCredits: 0,
      orphanPaymentsCount: 0,
      orphanEscrowsCount: 0,
      mismatchesCount: 0,
      duplicatesCount: 0,
      autoFixedCount: 0,
    }
  };

  try {
    // 1. Count totals
    const { count: paymentCount } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "locked");
    
    const { count: escrowCount } = await supabase
      .from("escrow_transactions")
      .select("*", { count: "exact", head: true })
      .eq("transaction_type", "credit");

    result.summary.totalPayments = paymentCount || 0;
    result.summary.totalEscrowCredits = escrowCount || 0;

    // 2. Find orphan payments (payments without escrow transactions)
    const { data: orphanPayments } = await supabase
      .from("payments")
      .select(`
        id,
        order_id,
        amount,
        status,
        created_at,
        merchant_id
      `)
      .eq("status", "locked");

    for (const payment of orphanPayments || []) {
      const { data: escrowTxn } = await supabase
        .from("escrow_transactions")
        .select("id")
        .eq("order_id", payment.order_id)
        .eq("transaction_type", "credit")
        .maybeSingle();

      if (!escrowTxn) {
        result.orphanPayments.push({
          paymentId: payment.id,
          orderId: payment.order_id,
          amount: payment.amount,
          status: payment.status,
          createdAt: payment.created_at,
          issue: "Payment exists but no escrow credit transaction found"
        });

        // Auto-fix: Create missing escrow transaction
        if (autoFix) {
          const { data: escrowAccount } = await supabase
            .from("escrow_accounts")
            .select("*")
            .eq("merchant_id", payment.merchant_id)
            .single();

          if (escrowAccount) {
            const newTotalBalance = escrowAccount.total_balance + payment.amount;
            const newLockedBalance = escrowAccount.locked_balance + payment.amount;

            // Update escrow account balance
            await supabase
              .from("escrow_accounts")
              .update({
                total_balance: newTotalBalance,
                locked_balance: newLockedBalance,
                updated_at: new Date().toISOString()
              })
              .eq("id", escrowAccount.id);

            // Create escrow transaction
            await supabase
              .from("escrow_transactions")
              .insert({
                escrow_account_id: escrowAccount.id,
                order_id: payment.order_id,
                transaction_type: "credit",
                amount: payment.amount,
                balance_before: escrowAccount.total_balance,
                balance_after: newTotalBalance,
                reason: "Reconciliation: Missing escrow credit restored",
                created_by: user.id,
              });

            result.autoFixed.push({
              type: "orphan_payment",
              id: payment.id,
              action: "Created missing escrow transaction"
            });
          }
        }
      }
    }

    // 3. Find orphan escrow transactions (escrow without payment)
    const { data: allEscrowCredits } = await supabase
      .from("escrow_transactions")
      .select(`
        id,
        order_id,
        amount,
        created_at
      `)
      .eq("transaction_type", "credit");

    for (const escrow of allEscrowCredits || []) {
      const { data: payment } = await supabase
        .from("payments")
        .select("id")
        .eq("order_id", escrow.order_id)
        .maybeSingle();

      if (!payment) {
        result.orphanEscrows.push({
          transactionId: escrow.id,
          orderId: escrow.order_id,
          amount: escrow.amount,
          createdAt: escrow.created_at,
          issue: "Escrow credit exists but no payment record found"
        });
        // Note: Auto-fix for orphan escrows is dangerous - requires manual review
      }
    }

    // 4. Find amount mismatches
    for (const payment of orphanPayments || []) {
      const { data: escrowTxn } = await supabase
        .from("escrow_transactions")
        .select("amount")
        .eq("order_id", payment.order_id)
        .eq("transaction_type", "credit")
        .maybeSingle();

      if (escrowTxn && Math.abs(payment.amount - escrowTxn.amount) > 0.01) {
        result.amountMismatches.push({
          paymentId: payment.id,
          orderId: payment.order_id,
          paymentAmount: payment.amount,
          escrowAmount: escrowTxn.amount,
          difference: Math.abs(payment.amount - escrowTxn.amount)
        });
      }
    }

    // 5. Find duplicate escrow credits per order
    const { data: duplicates } = await supabase.rpc('get_duplicate_escrow_credits');
    // If RPC doesn't exist, we skip this check
    if (duplicates) {
      for (const dup of duplicates) {
        result.duplicateEscrows.push({
          orderId: dup.order_id,
          creditCount: dup.credit_count,
          totalCredited: dup.total_credited
        });
      }
    }

    // Update summary
    result.summary.orphanPaymentsCount = result.orphanPayments.length;
    result.summary.orphanEscrowsCount = result.orphanEscrows.length;
    result.summary.mismatchesCount = result.amountMismatches.length;
    result.summary.duplicatesCount = result.duplicateEscrows.length;
    result.summary.autoFixedCount = result.autoFixed.length;

    console.log(`Reconciliation complete: ${JSON.stringify(result.summary)}`);

    return json(200, {
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });

  } catch (error) {
    console.error("Reconciliation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return json(500, { error: errorMessage });
  }
});