import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForceReleaseRequest {
  paymentId: string;
  reason: string;
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

    const { paymentId, reason } = await req.json() as ForceReleaseRequest;

    if (!paymentId || !reason) {
      return new Response(
        JSON.stringify({ error: "paymentId and reason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${adminUser.email} initiating force release for payment ${paymentId}`);

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

    // Check if payment can be released
    const releasableStatuses = ["locked", "pending", "in_escrow"];
    if (!releasableStatuses.includes(payment.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot release payment with status: ${payment.status}` }),
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

    const now = new Date().toISOString();

    // 1. Update payment status to released
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({ 
        status: "released",
        updated_at: now
      })
      .eq("id", paymentId);

    if (updatePaymentError) {
      console.error("Failed to update payment:", updatePaymentError);
      throw updatePaymentError;
    }

    // 2. Update order status to completed
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ 
        status: "completed",
        completed_at: now,
        updated_at: now
      })
      .eq("id", order.id);

    if (updateOrderError) {
      console.error("Failed to update order:", updateOrderError);
    }

    // 3. Close any open disputes
    await supabase
      .from("disputes")
      .update({ 
        status: "closed",
        final_decision: "Admin forced release to merchant",
        updated_at: now
      })
      .eq("order_id", order.id)
      .in("status", ["open", "under_review"]);

    // 4. Credit merchant wallet
    const { data: merchantWallet } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    if (merchantWallet) {
      await supabase
        .from("merchant_wallets")
        .update({
          available_balance: merchantWallet.available_balance + payment.amount,
          updated_at: now
        })
        .eq("id", merchantWallet.id);
      console.log(`Credited ₹${payment.amount} to merchant wallet`);
    } else {
      await supabase.from("merchant_wallets").insert({
        merchant_id: order.merchant_id,
        available_balance: payment.amount,
        currency: "INR"
      });
    }

    // 5. Create order event
    await supabase.from("order_events").insert({
      order_id: order.id,
      event_type: "admin_force_release",
      title: "Admin Force Release",
      description: `Admin ${adminUser.email} force released ₹${payment.amount} to merchant. Reason: ${reason}`,
      metadata: { admin_id: adminUser.id, admin_email: adminUser.email, reason, amount: payment.amount }
    });

    // 6. Notify merchant
    await supabase.from("merchant_notifications").insert({
      merchant_id: order.merchant_id,
      title: "Payment Released (Admin Action)",
      body: `₹${payment.amount} for order #${order.id.slice(0, 8)} has been released to your wallet by admin.`,
      type: "payment",
      priority: "high",
      related_order_id: order.id,
    });

    // 7. Notify customer
    await supabase.from("notifications").insert({
      user_id: order.customer_id,
      title: "Order Completed (Admin Action)",
      message: `Your order #${order.id.slice(0, 8)} has been marked complete by admin. Payment released to merchant.`,
      type: "order",
      order_id: order.id,
    });

    console.log(`Admin force release completed for payment ${paymentId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Force release completed successfully",
        paymentId,
        orderId: order.id,
        amount: payment.amount,
        merchantId: order.merchant_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin force release:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
