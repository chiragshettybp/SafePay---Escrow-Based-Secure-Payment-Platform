import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForceRefundRequest {
  paymentId: string;
  reason: string;
  refundType: "full" | "partial";
  refundAmount?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin from auth header
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

    // Verify admin role
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (adminError || !adminUser) {
      console.error("Admin verification failed:", adminError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { paymentId, reason, refundType, refundAmount } = await req.json() as ForceRefundRequest;

    if (!paymentId || !reason || !refundType) {
      return new Response(
        JSON.stringify({ error: "paymentId, reason, and refundType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${adminUser.email} initiating force refund for payment ${paymentId}`);

    // Fetch the payment with order details
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*, orders(*)")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if payment can be refunded
    const refundableStatuses = ["locked", "pending", "in_escrow"];
    if (!refundableStatuses.includes(payment.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot refund payment with status: ${payment.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = payment.orders;
    if (!order) {
      return new Response(
        JSON.stringify({ error: "Associated order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate refund amount
    const actualRefundAmount = refundType === "full" ? payment.amount : (refundAmount || payment.amount);
    
    if (actualRefundAmount <= 0 || actualRefundAmount > payment.amount) {
      return new Response(
        JSON.stringify({ error: "Invalid refund amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    // 1. Update payment status to refunded
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({ 
        status: "refunded",
        updated_at: now
      })
      .eq("id", paymentId);

    if (updatePaymentError) {
      console.error("Failed to update payment:", updatePaymentError);
      throw updatePaymentError;
    }

    // 2. Update order status to refunded
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ 
        status: "refunded",
        updated_at: now
      })
      .eq("id", order.id);

    if (updateOrderError) {
      console.error("Failed to update order:", updateOrderError);
    }

    // 3. Close any open disputes with customer won
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .eq("order_id", order.id)
      .in("status", ["open", "under_review"]);

    if (disputes && disputes.length > 0) {
      for (const dispute of disputes) {
        await supabase
          .from("disputes")
          .update({ 
            status: "resolved",
            final_decision: "Admin forced refund to customer",
            refund_amount: actualRefundAmount,
            updated_at: now
          })
          .eq("id", dispute.id);

        await supabase.from("dispute_updates").insert({
          dispute_id: dispute.id,
          title: "Dispute Resolved - Admin Refund",
          description: `Admin forced a ${refundType} refund of ₹${actualRefundAmount} to customer. Reason: ${reason}`,
          status: "resolved",
          created_by: adminUser.email,
        });
      }
    }

    // 4. Create refund record
    const { data: refundRecord, error: refundError } = await supabase
      .from("refunds")
      .insert({
        order_id: order.id,
        customer_id: order.customer_id,
        dispute_id: disputes?.[0]?.id || null,
        amount: actualRefundAmount,
        reason: `Admin Force Refund: ${reason}`,
        status: "initiated",
        payment_method: "original_payment",
      })
      .select()
      .single();

    if (refundError) {
      console.error("Failed to create refund record:", refundError);
    }

    // 5. Credit customer wallet
    const { data: customerWallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("customer_id", order.customer_id)
      .single();

    if (customerWallet) {
      await supabase
        .from("wallets")
        .update({
          balance: customerWallet.balance + actualRefundAmount,
          updated_at: now
        })
        .eq("id", customerWallet.id);
      console.log(`Credited ₹${actualRefundAmount} to customer wallet`);

      // Update refund status to completed
      if (refundRecord) {
        await supabase
          .from("refunds")
          .update({ status: "completed", credited_at: now })
          .eq("id", refundRecord.id);
      }
    } else {
      // Create wallet if doesn't exist
      await supabase.from("wallets").insert({
        customer_id: order.customer_id,
        balance: actualRefundAmount,
        currency: "INR"
      });
      console.log(`Created wallet and credited ₹${actualRefundAmount} to customer`);
    }

    // 6. Create order event
    await supabase.from("order_events").insert({
      order_id: order.id,
      event_type: "admin_force_refund",
      title: "Admin Force Refund",
      description: `Admin ${adminUser.email} force refunded ₹${actualRefundAmount} to customer. Reason: ${reason}`,
      metadata: { 
        admin_id: adminUser.id, 
        admin_email: adminUser.email, 
        reason, 
        refund_type: refundType,
        amount: actualRefundAmount 
      }
    });

    // 7. Notify customer
    await supabase.from("notifications").insert({
      user_id: order.customer_id,
      title: "Refund Processed (Admin Action)",
      message: `₹${actualRefundAmount} has been refunded to your wallet for order #${order.id.slice(0, 8)}.`,
      type: "refund",
      order_id: order.id,
    });

    // 8. Notify merchant
    await supabase.from("merchant_notifications").insert({
      merchant_id: order.merchant_id,
      title: "Order Refunded (Admin Action)",
      body: `Order #${order.id.slice(0, 8)} has been refunded by admin. Amount: ₹${actualRefundAmount}. Reason: ${reason}`,
      type: "order",
      priority: "high",
      related_order_id: order.id,
    });

    console.log(`Admin force refund completed for payment ${paymentId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Force refund completed successfully",
        paymentId,
        orderId: order.id,
        refundAmount: actualRefundAmount,
        refundType,
        customerId: order.customer_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin force refund:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
