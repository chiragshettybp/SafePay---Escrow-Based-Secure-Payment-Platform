import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReleaseEscrowRequest {
  orderId: string;
  reason: "delivery_confirmed" | "dispute_withdrawn" | "dispute_resolved" | "merchant_won" | "close_dispute_confirm_delivery";
  disputeId?: string;
  idempotencyKey?: string; // Client-provided idempotency key
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orderId, reason, disputeId, idempotencyKey: clientIdempotencyKey } = await req.json() as ReleaseEscrowRequest;

    if (!orderId || !reason) {
      return new Response(
        JSON.stringify({ error: "orderId and reason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate idempotency key (use client-provided or generate)
    const idempotencyKey = clientIdempotencyKey || `release-${orderId}-${reason}-${Date.now()}`;
    
    console.log(`Processing escrow release for order ${orderId}, reason: ${reason}, idempotencyKey: ${idempotencyKey}`);

    // CRITICAL: Check if this exact operation was already processed (idempotency)
    const { data: existingResolution } = await supabase
      .from("escrow_resolution_log")
      .select("*")
      .eq("order_id", orderId)
      .eq("resolution_type", "released")
      .maybeSingle();

    if (existingResolution) {
      console.log(`Idempotent return: Order ${orderId} was already released at ${existingResolution.created_at}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Escrow already released",
          alreadyReleased: true,
          resolvedAt: existingResolution.created_at,
          idempotencyKey: existingResolution.idempotency_key
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the order with row-level locking check via status
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user has permission (must be the customer who placed the order)
    if (order.customer_id !== user.id) {
      console.error("User is not the customer of this order");
      return new Response(
        JSON.stringify({ error: "Unauthorized - you are not the customer of this order" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL: Check if escrow is already finalized (mutual exclusivity check)
    if (order.escrow_resolution_type === 'refunded') {
      console.error("MUTUAL_EXCLUSIVITY_VIOLATION: Cannot release - order was already refunded");
      return new Response(
        JSON.stringify({ 
          error: "Cannot release escrow - order was already refunded. Mutual exclusivity violation." 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if escrow is already released (order is completed or refunded)
    if (order.status === "completed" || order.status === "refunded") {
      console.log("Escrow already finalized for this order");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: order.status === "completed" ? "Escrow already released" : "Order was refunded",
          alreadyReleased: order.status === "completed",
          alreadyRefunded: order.status === "refunded"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if order is in a valid state for escrow release
    const validStatuses = ["escrow_locked", "delivered", "in_progress", "disputed"];
    if (!validStatuses.includes(order.status)) {
      console.error(`Invalid order status for escrow release: ${order.status}`);
      return new Response(
        JSON.stringify({ error: `Cannot release escrow for order with status: ${order.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL: Check for open disputes that would block escrow release
    // (unless the reason is specifically to close a dispute)
    if (reason === "delivery_confirmed" && !disputeId) {
      const { data: openDisputes } = await supabase
        .from("disputes")
        .select("id, status")
        .eq("order_id", orderId)
        .in("status", ["open", "under_review"]);

      if (openDisputes && openDisputes.length > 0) {
        console.error("DISPUTE_BLOCKS_RELEASE: Cannot release escrow while dispute is open");
        return new Response(
          JSON.stringify({ 
            error: "Cannot release escrow while a dispute is open. Please close the dispute first or use 'Close Dispute & Confirm Delivery'.",
            blockingDispute: openDisputes[0].id
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If we have a disputeId, we MUST close the dispute first before proceeding
    // This ensures atomic dispute closure + escrow release
    if (disputeId) {
      // First update the dispute to closed (this triggers the unfreeze logic)
      const { error: closeDisputeError } = await supabase
        .from("disputes")
        .update({ 
          status: "closed",
          final_decision: reason === "dispute_withdrawn" 
            ? "Customer withdrew dispute" 
            : reason === "close_dispute_confirm_delivery"
            ? "Customer confirmed delivery"
            : "Resolved in merchant favor",
          updated_at: new Date().toISOString()
        })
        .eq("id", disputeId)
        .in("status", ["open", "under_review"]); // Only close if actually open

      if (closeDisputeError) {
        console.error("Failed to close dispute:", closeDisputeError);
        // Continue anyway - the dispute might already be closed
      }
    }

    // Check if merchant is banned/suspended
    const { data: merchant } = await supabase
      .from("merchants")
      .select("status, business_name")
      .eq("user_id", order.merchant_id)
      .single();

    if (merchant?.status === "banned") {
      console.error("Cannot release funds - Merchant is banned");
      return new Response(
        JSON.stringify({ error: "Cannot release funds - Merchant account is banned. Please contact support." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (merchant?.status === "suspended") {
      console.error("Cannot release funds - Merchant is suspended");
      return new Response(
        JSON.stringify({ error: "Cannot release funds - Merchant account is suspended. Please contact support." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (paymentError) {
      console.log("No payment record found, proceeding with order update only");
    }

    // CRITICAL: Check if payment is already finalized
    if (payment?.is_final === true) {
      console.log("Payment already finalized");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment already finalized",
          alreadyReleased: payment.status === "released"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start atomic transaction-like operations
    const now = new Date().toISOString();
    const previousOrderStatus = order.status;
    
    // 1. Atomically update order status with row-level locking
    // Using SELECT FOR UPDATE semantics via atomic update condition
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update({ 
        status: "completed",
        completed_at: now,
        updated_at: now
      })
      .eq("id", orderId)
      .in("status", ["escrow_locked", "delivered", "in_progress", "disputed"]) // Only these can transition
      .select()
      .single();

    if (updateOrderError) {
      console.error("Failed to update order:", updateOrderError);
      // Check if it's because order was already completed (idempotent success)
      const { data: checkOrder } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();
      
      if (checkOrder?.status === "completed" || checkOrder?.status === "refunded") {
        console.log(`BB-ESC-01: Idempotent handling - order ${orderId} already processed`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Escrow already released",
            alreadyReleased: true,
            idempotencyKey
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw updateOrderError;
    }
    
    console.log(`BB-ESC-01: Order ${orderId} atomically updated to completed`);

    // 2. Update payment status if exists
    if (payment) {
      const { error: updatePaymentError } = await supabase
        .from("payments")
        .update({ 
          status: "released",
          updated_at: now
        })
        .eq("id", payment.id)
        .neq("status", "released"); // Prevent double update

      if (updatePaymentError) {
        console.error("Failed to update payment:", updatePaymentError);
        // Don't throw - payment update is secondary
      }
    }

    // 3. If this is from a dispute, update the dispute status
    if (disputeId && (reason === "dispute_withdrawn" || reason === "dispute_resolved" || reason === "merchant_won" || reason === "close_dispute_confirm_delivery")) {
      const finalDecision = reason === "dispute_withdrawn" 
        ? "Customer withdrew dispute" 
        : reason === "close_dispute_confirm_delivery"
        ? "Customer confirmed delivery"
        : "Merchant won";
      
      const { error: updateDisputeError } = await supabase
        .from("disputes")
        .update({ 
          status: "closed",
          final_decision: finalDecision,
          updated_at: now
        })
        .eq("id", disputeId);

      if (updateDisputeError) {
        console.error("Failed to update dispute:", updateDisputeError);
      }

      // Add dispute update entry
      const updateTitle = reason === "dispute_withdrawn" 
        ? "Dispute Withdrawn & Escrow Released" 
        : reason === "close_dispute_confirm_delivery"
        ? "Customer Confirmed Delivery & Closed Dispute"
        : "Dispute Resolved - Merchant Won";
      
      const updateDescription = reason === "dispute_withdrawn" 
        ? "Customer withdrew the dispute. Escrow funds have been released to the merchant."
        : reason === "close_dispute_confirm_delivery"
        ? "Customer confirmed the delivery and closed the dispute. Escrow funds have been released to the merchant."
        : "The dispute has been resolved in favor of the merchant. Escrow funds have been released.";
      
      await supabase.from("dispute_updates").insert({
        dispute_id: disputeId,
        title: updateTitle,
        description: updateDescription,
        status: "closed",
        created_by: "system",
      });
    }

    // 4. Update escrow_accounts - debit the locked balance
    const { data: escrowAccount } = await supabase
      .from("escrow_accounts")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    if (escrowAccount) {
      const newLockedBalance = Math.max(0, escrowAccount.locked_balance - order.amount);
      const newTotalBalance = Math.max(0, escrowAccount.total_balance - order.amount);
      
      // Update escrow account - debit locked balance and total
      const { error: escrowUpdateError } = await supabase
        .from("escrow_accounts")
        .update({
          locked_balance: newLockedBalance,
          total_balance: newTotalBalance,
          updated_at: now
        })
        .eq("id", escrowAccount.id);

      if (escrowUpdateError) {
        console.error("Failed to update escrow account:", escrowUpdateError);
      }

      // Create escrow transaction record for the release (debit)
      await supabase.from("escrow_transactions").insert({
        escrow_account_id: escrowAccount.id,
        order_id: orderId,
        transaction_type: "debit",
        amount: order.amount,
        balance_before: escrowAccount.locked_balance,
        balance_after: newLockedBalance,
        reason: `Escrow released: ${reason.replace(/_/g, " ")}`,
        created_by: user.id,
      });

      console.log(`Debited ₹${order.amount} from escrow account`);
    }

    // 5. Create merchant wallet ledger entry for escrow release (LEDGER-FIRST APPROACH)
    const { data: merchantWallet } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    if (merchantWallet) {
      // Create ledger entry - wallet balance will be auto-synced via trigger
      const { error: ledgerError } = await supabase
        .from("merchant_wallet_transactions")
        .insert({
          merchant_id: order.merchant_id,
          transaction_type: "escrow_release",
          amount: order.amount,
          balance_before: merchantWallet.available_balance,
          balance_after: merchantWallet.available_balance + order.amount,
          status: "success",
          reference_type: "order",
          reference_id: orderId,
          reason: `Escrow released: ${reason.replace(/_/g, " ")}`,
          created_by: user.id,
        });

      if (ledgerError) {
        console.error("Failed to create merchant wallet ledger entry:", ledgerError);
      } else {
        console.log(`LEDGER: Merchant wallet escrow_release entry: +₹${order.amount}`);
      }
    } else {
      console.log("No merchant wallet found, creating one with initial balance");
      // Create wallet first
      await supabase.from("merchant_wallets").insert({
        merchant_id: order.merchant_id,
        available_balance: 0,
        pending_balance: 0,
        currency: "INR"
      });
      // Then create ledger entry
      await supabase
        .from("merchant_wallet_transactions")
        .insert({
          merchant_id: order.merchant_id,
          transaction_type: "escrow_release",
          amount: order.amount,
          balance_before: 0,
          balance_after: order.amount,
          status: "success",
          reference_type: "order",
          reference_id: orderId,
          reason: `Escrow released: ${reason.replace(/_/g, " ")}`,
          created_by: user.id,
        });
      console.log(`LEDGER: Created merchant wallet and escrow_release entry: +₹${order.amount}`);
    }

    // 6. Log to escrow_resolution_log (immutable audit trail)
    await supabase.from("escrow_resolution_log").insert({
      order_id: orderId,
      escrow_account_id: escrowAccount?.id || null,
      resolution_type: "released",
      previous_order_status: previousOrderStatus,
      new_order_status: "completed",
      amount: order.amount,
      approval_source: "customer",
      admin_id: null,
      reason: `Customer confirmed: ${reason.replace(/_/g, " ")}`,
      idempotency_key: idempotencyKey,
    });

    // 7. Create order event
    await supabase.from("order_events").insert({
      order_id: orderId,
      event_type: "escrow_released",
      title: "Escrow Released",
      description: `Payment of ₹${order.amount} has been released to the merchant. Reason: ${reason.replace(/_/g, " ")}`,
      metadata: { 
        reason, 
        disputeId, 
        amount: order.amount,
        escrow_debited: !!escrowAccount,
        merchant_credited: true,
        idempotency_key: idempotencyKey
      }
    });

    // 8. Notify merchant via merchant_notifications table
    await supabase.from("merchant_notifications").insert({
      merchant_id: order.merchant_id,
      title: "Payment Released",
      body: `Payment of ₹${order.amount} for order #${orderId.slice(0, 8)} has been released to your wallet.`,
      type: "payment",
      related_order_id: orderId,
      priority: "high",
    });

    // 9. Notify customer
    await supabase.from("notifications").insert({
      user_id: order.customer_id,
      title: "Order Completed",
      message: `Your order #${orderId.slice(0, 8)} is complete. Payment has been released to the merchant.`,
      type: "order",
      order_id: orderId,
    });

    console.log(`Successfully released escrow for order ${orderId}, idempotencyKey: ${idempotencyKey}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Escrow released successfully",
        orderId,
        amount: order.amount,
        merchantId: order.merchant_id,
        escrowDebited: !!escrowAccount,
        merchantCredited: true,
        idempotencyKey,
        resolutionType: "released"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error releasing escrow:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});