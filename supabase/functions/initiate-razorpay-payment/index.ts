/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitiatePaymentRequest {
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
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration");
    return json(500, { error: "Missing server configuration" });
  }

  if (!razorpayKeyId || !razorpayKeySecret) {
    console.error("Missing Razorpay configuration");
    return json(500, { error: "Payment gateway not configured" });
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

  let payload: InitiatePaymentRequest;
  try {
    payload = (await req.json()) as InitiatePaymentRequest;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { orderId } = payload;

  if (!orderId) {
    return json(400, { error: "orderId is required" });
  }

  console.log(`Initiating Razorpay payment for order ${orderId} by user ${user.id}`);

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

    // 2. Validate order is in draft or pending status (pending = checkout flow, draft = legacy)
    if (order.status !== "draft" && order.status !== "pending") {
      console.log(`Order ${orderId} is not in valid status for payment: ${order.status}`);
      return json(400, { error: `Order already processed with status: ${order.status}` });
    }

    // 3. Check for existing payment with Razorpay order
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, razorpay_order_id, gateway_status")
      .eq("order_id", orderId)
      .maybeSingle();

    // If payment exists with verified status, block
    if (existingPayment?.gateway_status === "verified") {
      console.log(`Payment already verified for order ${orderId}`);
      return json(400, { error: "Payment already completed" });
    }

    // If payment exists with valid Razorpay order, return existing (idempotent)
    if (existingPayment?.razorpay_order_id && existingPayment.gateway_status === "created") {
      console.log(`Returning existing Razorpay order for ${orderId}`);
      return json(200, {
        success: true,
        razorpay_order_id: existingPayment.razorpay_order_id,
        amount: order.amount * 100, // paise
        currency: "INR",
        orderId: orderId,
        key_id: razorpayKeyId,
        alreadyCreated: true,
      });
    }

    // 4. Calculate total amount including fees
    const ESCROW_FEE_PERCENT = 1;
    const GST_PERCENT = 18;
    const platformFee = order.amount * (ESCROW_FEE_PERCENT / 100);
    const gstOnFee = platformFee * (GST_PERCENT / 100);
    const totalAmount = Math.round((order.amount + platformFee + gstOnFee) * 100) / 100;
    const amountInPaise = Math.round(totalAmount * 100);

    // 5. Create Razorpay Order
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${razorpayAuth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `order_${orderId.slice(0, 8)}`,
        notes: {
          order_id: orderId,
          customer_id: user.id,
          merchant_id: order.merchant_id,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text();
      console.error("Razorpay order creation failed:", errorData);
      return json(500, { error: "Failed to create payment order" });
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log(`Razorpay order created: ${razorpayOrder.id}`);

    // 6. Create or update payment record
    const paymentData = {
      order_id: orderId,
      customer_id: user.id,
      merchant_id: order.merchant_id,
      amount: order.amount,
      status: "pending",
      payment_gateway: "razorpay",
      razorpay_order_id: razorpayOrder.id,
      gateway_status: "created",
    };

    let paymentId: string;
    
    if (existingPayment) {
      // Update existing payment
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          razorpay_order_id: razorpayOrder.id,
          gateway_status: "created",
          gateway_failure_reason: null,
        })
        .eq("id", existingPayment.id);

      if (updateError) {
        console.error("Failed to update payment:", updateError);
        return json(500, { error: "Failed to update payment record" });
      }
      paymentId = existingPayment.id;
    } else {
      // Create new payment
      const { data: newPayment, error: paymentError } = await supabase
        .from("payments")
        .insert(paymentData)
        .select("id")
        .single();

      if (paymentError) {
        console.error("Failed to create payment:", paymentError);
        return json(500, { error: "Failed to create payment record" });
      }
      paymentId = newPayment.id;
    }

    console.log(`Payment record ${paymentId} ready for Razorpay order ${razorpayOrder.id}`);

    // 7. Get user profile for prefill
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    return json(200, {
      success: true,
      razorpay_order_id: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      orderId: orderId,
      paymentId: paymentId,
      key_id: razorpayKeyId,
      prefill: {
        name: profile?.full_name || "",
        email: user.email || "",
        contact: profile?.phone || "",
      },
      merchant_name: order.merchant_name,
      product_name: order.product_name,
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return json(500, { error: errorMessage });
  }
});