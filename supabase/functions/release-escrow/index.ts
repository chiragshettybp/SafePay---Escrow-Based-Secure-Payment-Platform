import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReleaseEscrowRequest {
  orderId: string;
  reason: "delivery_confirmed" | "dispute_withdrawn" | "dispute_resolved" | "merchant_won";
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

    // Fetch payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (paymentError) {
      console.log("No payment record found, proceeding with order update only");
    }

    // Start transaction-like operations
    const now = new Date().toISOString();
    
    // 1. Update order status to completed
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ 
        status: "completed",
        completed_at: now,
        updated_at: now
      })
      .eq("id", orderId);

    if (updateOrderError) {
      console.error("Failed to update order:", updateOrderError);
      throw updateOrderError;
    }

    // 2. Update payment status if exists
    if (payment) {
      const { error: updatePaymentError } = await supabase
        .from("payments")
        .update({ 
          status: "released",
          updated_at: now
        })
        .eq("id", payment.id);

      if (updatePaymentError) {
        console.error("Failed to update payment:", updatePaymentError);
        // Don't throw - payment update is secondary
      }
    }

    // 3. If this is from a dispute, update the dispute status
    if (disputeId && (reason === "dispute_withdrawn" || reason === "dispute_resolved" || reason === "merchant_won")) {
      const { error: updateDisputeError } = await supabase
        .from("disputes")
        .update({ 
          status: "closed",
          final_decision: reason === "dispute_withdrawn" ? "Customer withdrew dispute" : "Merchant won",
          updated_at: now
        })
        .eq("id", disputeId);

      if (updateDisputeError) {
        console.error("Failed to update dispute:", updateDisputeError);
      }

      // Add dispute update entry
      await supabase.from("dispute_updates").insert({
        dispute_id: disputeId,
        title: reason === "dispute_withdrawn" ? "Dispute Withdrawn & Escrow Released" : "Dispute Resolved - Merchant Won",
        description: reason === "dispute_withdrawn" 
          ? "Customer withdrew the dispute. Escrow funds have been released to the merchant."
          : "The dispute has been resolved in favor of the merchant. Escrow funds have been released.",
        status: "closed",
        created_by: "system",
      });
    }

    // 4. Create order event
    await supabase.from("order_events").insert({
      order_id: orderId,
      event_type: "escrow_released",
      title: "Escrow Released",
      description: `Payment of $${order.amount} has been released to the merchant. Reason: ${reason.replace(/_/g, " ")}`,
      metadata: { reason, disputeId, amount: order.amount }
    });

    // 5. Notify merchant
    await supabase.from("notifications").insert({
      user_id: order.merchant_id,
      title: "Payment Released",
      message: `Payment of $${order.amount} for order #${orderId.slice(0, 8)} has been released to you.`,
      type: "payment",
      order_id: orderId,
    });

    // 6. Notify customer
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
        merchantId: order.merchant_id
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
