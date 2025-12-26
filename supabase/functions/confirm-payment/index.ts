/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmPaymentRequest {
  orderId: string;
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

  let payload: ConfirmPaymentRequest;
  try {
    payload = (await req.json()) as ConfirmPaymentRequest;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { orderId } = payload;

  if (!orderId) {
    return json(400, { error: "orderId is required" });
  }

  // Generate idempotency key for this payment attempt
  const idempotencyKey = `payment-${orderId}-${user.id}`;
  console.log(`Processing payment confirmation for order ${orderId} by user ${user.id}, idempotency: ${idempotencyKey}`);

  try {
    // 1. Fetch the order and verify ownership
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return json(404, { error: "Order not found" });
    }

    // 2. Check if already processed (idempotency)
    if (order.status !== "draft") {
      console.log(`IDEMPOTENT: Order ${orderId} already processed with status: ${order.status}`);
      return json(200, { 
        success: true, 
        message: "Order already processed",
        alreadyProcessed: true,
        orderId,
        status: order.status,
        idempotencyKey
      });
    }

    // 3. Check for existing payment (prevent duplicates via DB constraint + check)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, transaction_reference")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingPayment) {
      console.log(`IDEMPOTENT: Payment already exists for order ${orderId}: ${existingPayment.id}`);
      return json(200, { 
        success: true, 
        message: "Payment already exists",
        alreadyProcessed: true,
        orderId,
        paymentId: existingPayment.id,
        idempotencyKey
      });
    }

    // 4. Check if merchant is valid and active
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("user_id, status, business_name")
      .eq("user_id", order.merchant_id)
      .single();

    if (merchantError || !merchant) {
      console.error("Merchant not found:", merchantError);
      return json(400, { error: "Merchant not found" });
    }

    if (merchant.status !== "active") {
      console.error("Merchant not active:", merchant.status);
      return json(400, { error: "Merchant is not available for orders" });
    }

    // 5. Check if merchant is banned
    const { data: banRecord } = await supabase
      .from("user_bans")
      .select("id")
      .eq("user_id", order.merchant_id)
      .eq("is_active", true)
      .maybeSingle();

    if (banRecord) {
      console.error("Merchant is banned");
      return json(400, { error: "Merchant is currently suspended" });
    }

    // 6. CRITICAL: Verify merchant has an escrow account BEFORE proceeding
    const { data: escrowAccount, error: escrowFetchError } = await supabase
      .from("escrow_accounts")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    if (escrowFetchError || !escrowAccount) {
      console.error("BLOCKER: Merchant has no escrow account:", escrowFetchError);
      // Try to create one (auto-recovery)
      const { data: newEscrow, error: createEscrowError } = await supabase
        .from("escrow_accounts")
        .insert({
          merchant_id: order.merchant_id,
          total_balance: 0,
          locked_balance: 0,
          available_balance: 0
        })
        .select()
        .single();

      if (createEscrowError) {
        console.error("Failed to create escrow account:", createEscrowError);
        return json(500, { error: "Merchant escrow account not configured. Please contact support." });
      }
      console.log(`Auto-created escrow account for merchant ${order.merchant_id}`);
      // Use the newly created account
      Object.assign(escrowAccount || {}, newEscrow);
    }

    const now = new Date().toISOString();
    const transactionRef = `TXN-${Date.now()}-${orderId.slice(0, 8)}`;

    // 7. ATOMIC STEP 1: Update order status with condition check
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update({ 
        status: "escrow_locked",
        updated_at: now
      })
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .eq("status", "draft") // Only update if still draft (atomic check)
      .select()
      .single();

    if (updateOrderError || !updatedOrder) {
      console.error("Failed to update order (possible race condition):", updateOrderError);
      // Check current status for idempotent response
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();
      
      if (currentOrder && currentOrder.status !== "draft") {
        return json(200, { 
          success: true, 
          message: "Order already processed (race condition handled)",
          alreadyProcessed: true,
          orderId,
          status: currentOrder.status,
          idempotencyKey
        });
      }
      return json(500, { error: "Failed to process payment. Please try again." });
    }

    console.log(`ATOMIC: Order ${orderId} status updated to escrow_locked`);

    // 8. ATOMIC STEP 2: Create payment record (unique constraint on order_id prevents duplicates)
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: orderId,
        customer_id: user.id,
        merchant_id: order.merchant_id,
        amount: order.amount, // CRITICAL: Use DB amount, not client amount
        status: "locked",
        transaction_reference: transactionRef,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to create payment:", paymentError);
      // Check if it's a duplicate constraint violation (idempotent)
      if (paymentError.code === '23505') { // Unique violation
        console.log("IDEMPOTENT: Payment already exists (caught by constraint)");
        const { data: existingPmt } = await supabase
          .from("payments")
          .select("id")
          .eq("order_id", orderId)
          .single();
        return json(200, { 
          success: true, 
          message: "Payment already exists",
          alreadyProcessed: true,
          orderId,
          paymentId: existingPmt?.id,
          idempotencyKey
        });
      }
      // CRITICAL ROLLBACK: Revert order status
      await supabase
        .from("orders")
        .update({ status: "draft", updated_at: now })
        .eq("id", orderId);
      console.error("ROLLBACK: Order reverted to draft after payment failure");
      return json(500, { error: "Failed to create payment record. Please try again." });
    }

    console.log(`ATOMIC: Payment record created: ${payment.id}`);

    // 9. ATOMIC STEP 3: Update escrow account (MUST succeed or full rollback)
    const newTotalBalance = (escrowAccount?.total_balance || 0) + order.amount;
    const newLockedBalance = (escrowAccount?.locked_balance || 0) + order.amount;

    const { error: escrowUpdateError } = await supabase
      .from("escrow_accounts")
      .update({
        total_balance: newTotalBalance,
        locked_balance: newLockedBalance,
        updated_at: now
      })
      .eq("id", escrowAccount!.id);

    if (escrowUpdateError) {
      console.error("CRITICAL: Failed to update escrow:", escrowUpdateError);
      // FULL ROLLBACK: Delete payment and revert order
      await supabase.from("payments").delete().eq("id", payment.id);
      await supabase.from("orders").update({ status: "draft", updated_at: now }).eq("id", orderId);
      console.error("ROLLBACK: Payment deleted, order reverted after escrow failure");
      return json(500, { error: "Failed to lock funds in escrow. Please try again." });
    }

    // 10. ATOMIC STEP 4: Create escrow transaction record (unique constraint prevents duplicates)
    const { error: escrowTxnError } = await supabase
      .from("escrow_transactions")
      .insert({
        escrow_account_id: escrowAccount!.id,
        order_id: orderId,
        transaction_type: "credit",
        amount: order.amount,
        balance_before: escrowAccount?.total_balance || 0,
        balance_after: newTotalBalance,
        reason: "Payment locked in escrow",
        created_by: user.id,
      });

    if (escrowTxnError) {
      // Check if it's a duplicate (idempotent - escrow already credited)
      if (escrowTxnError.code === '23505') {
        console.log("IDEMPOTENT: Escrow transaction already exists");
      } else {
        console.error("Warning: Failed to create escrow transaction record:", escrowTxnError);
        // This is a logging failure, not a blocker - the balance is already updated
      }
    } else {
      console.log(`ATOMIC: Escrow credited: ₹${order.amount}`);
    }

    // 11. Create merchant wallet ledger entry (LEDGER-FIRST APPROACH)
    const { data: merchantWallet } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .maybeSingle();

    if (merchantWallet) {
      // Create ledger entry - wallet balance will be auto-synced via trigger
      await supabase
        .from("merchant_wallet_transactions")
        .insert({
          merchant_id: order.merchant_id,
          transaction_type: "escrow_credit",
          amount: order.amount,
          balance_before: merchantWallet.pending_balance,
          balance_after: merchantWallet.pending_balance + order.amount,
          status: "success",
          reference_type: "order",
          reference_id: orderId,
          reason: `Payment locked in escrow for order ${orderId.slice(0, 8)}`,
          created_by: user.id,
        });
      console.log(`LEDGER: Merchant wallet escrow_credit entry: +₹${order.amount}`);
    }

    // 12. Create notifications (non-blocking)
    await Promise.all([
      supabase.from("notifications").insert({
        user_id: user.id,
        title: "Payment Locked in Escrow",
        message: `Your payment of ₹${order.amount.toFixed(2)} to ${order.merchant_name} has been locked in escrow.`,
        type: "payment",
        order_id: orderId,
      }),
      supabase.from("merchant_notifications").insert({
        merchant_id: order.merchant_id,
        title: "New Order Received",
        body: `New order of ₹${order.amount.toFixed(2)} for ${order.product_name} has been placed. Funds are locked in escrow.`,
        type: "order",
        related_order_id: orderId,
      })
    ]);

    console.log(`SUCCESS: Payment confirmation completed for order ${orderId}`);

    return json(200, {
      success: true,
      message: "Payment confirmed and locked in escrow",
      orderId,
      paymentId: payment.id,
      amount: order.amount,
      transactionReference: transactionRef,
      escrowLocked: true,
      idempotencyKey
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return json(500, { error: errorMessage });
  }
});