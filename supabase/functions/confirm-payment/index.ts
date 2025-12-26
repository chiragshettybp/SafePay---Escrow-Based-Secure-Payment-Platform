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

    // 3. CRITICAL: Check for existing payment and verify gateway status
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, transaction_reference, gateway_status, razorpay_payment_id, verified_at")
      .eq("order_id", orderId)
      .maybeSingle();

    // 3a. CRITICAL SECURITY CHECK: Payment MUST exist with verified gateway_status
    if (!existingPayment) {
      console.error(`SECURITY BLOCK: No payment record exists for order ${orderId}. Razorpay payment required first.`);
      return json(400, { error: "Payment not initiated. Please complete payment through Razorpay first." });
    }

    // 3b. CRITICAL: Gateway status MUST be 'verified' before escrow can be locked
    if (existingPayment.gateway_status !== "verified") {
      console.error(`SECURITY BLOCK: Payment gateway not verified for order ${orderId}. Status: ${existingPayment.gateway_status}`);
      return json(400, { 
        error: `Payment not verified. Current status: ${existingPayment.gateway_status}. Complete Razorpay payment first.`,
        gateway_status: existingPayment.gateway_status
      });
    }

    // 3c. Verify Razorpay payment ID exists (additional security)
    if (!existingPayment.razorpay_payment_id) {
      console.error(`SECURITY BLOCK: No Razorpay payment ID for order ${orderId}`);
      return json(400, { error: "Invalid payment state. Razorpay payment ID missing." });
    }

    console.log(`Payment verified: ${existingPayment.id}, Razorpay: ${existingPayment.razorpay_payment_id}`);

    // 3d. If payment status is already 'locked', return idempotent response
    if (existingPayment.status === "locked" || existingPayment.status === "escrow") {
      console.log(`IDEMPOTENT: Escrow already locked for order ${orderId}`);
      return json(200, { 
        success: true, 
        message: "Payment already locked in escrow",
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

    // 8. ATOMIC STEP 2: Update existing payment record to locked status
    // Payment already exists from initiate-razorpay-payment, just update status
    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: "locked",
        transaction_reference: existingPayment.transaction_reference || transactionRef,
        updated_at: now,
      })
      .eq("id", existingPayment.id)
      .eq("gateway_status", "verified"); // Extra safety check

    if (paymentUpdateError) {
      console.error("Failed to update payment to locked:", paymentUpdateError);
      // CRITICAL ROLLBACK: Revert order status
      await supabase
        .from("orders")
        .update({ status: "draft", updated_at: now })
        .eq("id", orderId);
      console.error("ROLLBACK: Order reverted to draft after payment update failure");
      return json(500, { error: "Failed to lock payment. Please try again." });
    }

    const payment = existingPayment;
    console.log(`ATOMIC: Payment ${payment.id} updated to locked status`);

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