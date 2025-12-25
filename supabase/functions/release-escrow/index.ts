import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReleaseEscrowRequest {
  orderId: string;
  reason: "delivery_confirmed" | "dispute_withdrawn" | "dispute_resolved" | "merchant_won" | "close_dispute_confirm_delivery";
  disputeId?: string;
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

    const { orderId, reason, disputeId } = await req.json() as ReleaseEscrowRequest;

    if (!orderId || !reason) {
      return new Response(
        JSON.stringify({ error: "orderId and reason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing escrow release for order ${orderId}, reason: ${reason}`);

    // Fetch the order
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

    // Check if escrow is already released (order is completed or refunded)
    if (order.status === "completed" || order.status === "refunded") {
      console.log("Escrow already released for this order");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Escrow already released",
          alreadyReleased: true 
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
        console.error("Cannot release escrow while dispute is open");
        return new Response(
          JSON.stringify({ 
            error: "Cannot release escrow while a dispute is open. Please close the dispute first or use 'Close Dispute & Confirm Delivery'." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // FIX GAP 5: Check if merchant is banned/suspended
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

    // BB-ESC-01 FIX: Generate idempotency key based on order and action
    const idempotencyKey = `release-${orderId}-${reason}`;
    
    // Start transaction-like operations with atomic locking
    const now = new Date().toISOString();
    
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

    // 5. Credit merchant wallet with earnings (move from pending to available)
    const { data: merchantWallet } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    if (merchantWallet) {
      // Deduct from pending_balance and add to available_balance
      const newPendingBalance = Math.max(0, merchantWallet.pending_balance - order.amount);
      const newAvailableBalance = merchantWallet.available_balance + order.amount;
      
      const { error: walletUpdateError } = await supabase
        .from("merchant_wallets")
        .update({
          available_balance: newAvailableBalance,
          pending_balance: newPendingBalance,
          updated_at: now
        })
        .eq("id", merchantWallet.id);

      if (walletUpdateError) {
        console.error("Failed to update merchant wallet:", walletUpdateError);
      } else {
        console.log(`Credited ₹${order.amount} to merchant wallet (pending: ${merchantWallet.pending_balance} -> ${newPendingBalance}, available: ${merchantWallet.available_balance} -> ${newAvailableBalance})`);
      }
    } else {
      console.log("No merchant wallet found, creating one");
      // Create wallet if doesn't exist
      await supabase.from("merchant_wallets").insert({
        merchant_id: order.merchant_id,
        available_balance: order.amount,
        pending_balance: 0,
        currency: "INR"
      });
    }

    // 6. Create order event
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
        merchant_credited: true
      }
    });

    // 7. Notify merchant via merchant_notifications table
    await supabase.from("merchant_notifications").insert({
      merchant_id: order.merchant_id,
      title: "Payment Released",
      body: `Payment of ₹${order.amount} for order #${orderId.slice(0, 8)} has been released to your wallet.`,
      type: "payment",
      related_order_id: orderId,
      priority: "high",
    });

    // 8. Notify customer
    await supabase.from("notifications").insert({
      user_id: order.customer_id,
      title: "Order Completed",
      message: `Your order #${orderId.slice(0, 8)} is complete. Payment has been released to the merchant.`,
      type: "order",
      order_id: orderId,
    });

    console.log(`Successfully released escrow for order ${orderId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Escrow released successfully",
        orderId,
        amount: order.amount,
        merchantId: order.merchant_id,
        escrowDebited: !!escrowAccount,
        merchantCredited: true
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