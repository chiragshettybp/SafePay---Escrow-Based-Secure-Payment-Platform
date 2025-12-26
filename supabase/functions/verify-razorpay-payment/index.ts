/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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

// HMAC SHA256 signature verification
async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const message = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  return expectedSignature === signature;
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
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration");
    return json(500, { error: "Missing server configuration" });
  }

  if (!razorpayKeySecret) {
    console.error("Missing Razorpay secret key");
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

  let payload: VerifyPaymentRequest;
  try {
    payload = (await req.json()) as VerifyPaymentRequest;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json(400, { error: "Missing required payment verification fields" });
  }

  console.log(`Verifying Razorpay payment for order ${orderId} by user ${user.id}`);
  console.log(`Razorpay order: ${razorpay_order_id}, payment: ${razorpay_payment_id}`);

  try {
    // 1. Verify the signature
    const isValidSignature = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isValidSignature) {
      console.error("SECURITY: Invalid Razorpay signature for order", orderId);
      
      // Update payment as failed
      await supabase
        .from("payments")
        .update({
          gateway_status: "failed",
          gateway_failure_reason: "Invalid payment signature - possible tampering",
        })
        .eq("order_id", orderId)
        .eq("razorpay_order_id", razorpay_order_id);
      
      return json(400, { error: "Payment verification failed - invalid signature" });
    }

    console.log(`Signature verified successfully for order ${orderId}`);

    // 2. Fetch the payment record and verify
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (paymentError || !payment) {
      console.error("Payment record not found:", paymentError);
      return json(404, { error: "Payment record not found" });
    }

    // 3. Check if already verified (idempotency)
    if (payment.gateway_status === "verified") {
      console.log(`Payment already verified for order ${orderId}`);
      return json(200, {
        success: true,
        verified: true,
        alreadyVerified: true,
        orderId,
        paymentId: payment.id,
      });
    }

    // 4. Verify order ownership
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, amount, status")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .single();

    if (orderError || !order) {
      console.error("Order not found or unauthorized:", orderError);
      return json(403, { error: "Unauthorized access to order" });
    }

    // 5. Verify amounts match (within tolerance for rounding)
    // The Razorpay amount includes platform fees
    const ESCROW_FEE_PERCENT = 1;
    const GST_PERCENT = 18;
    const platformFee = order.amount * (ESCROW_FEE_PERCENT / 100);
    const gstOnFee = platformFee * (GST_PERCENT / 100);
    const expectedTotal = Math.round((order.amount + platformFee + gstOnFee) * 100) / 100;
    const paymentAmount = payment.amount;

    // Payment.amount stores base amount, verify it matches
    if (Math.abs(paymentAmount - order.amount) > 0.01) {
      console.error(`Amount mismatch: payment=${paymentAmount}, order=${order.amount}`);
      return json(400, { error: "Payment amount mismatch" });
    }

    // 6. Check if payment_id was already used (prevent replay)
    const { data: existingWithPaymentId } = await supabase
      .from("payments")
      .select("id, order_id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();

    if (existingWithPaymentId && existingWithPaymentId.order_id !== orderId) {
      console.error(`SECURITY: Payment ID ${razorpay_payment_id} already used for different order`);
      return json(400, { error: "Payment already used for another order" });
    }

    // 7. Update payment record with verified status
    const now = new Date().toISOString();
    const transactionRef = `RZP-${razorpay_payment_id}`;

    const { error: updateError } = await supabase
      .from("payments")
      .update({
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        gateway_status: "verified",
        verified_at: now,
        transaction_reference: transactionRef,
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Failed to update payment:", updateError);
      return json(500, { error: "Failed to update payment record" });
    }

    console.log(`Payment ${payment.id} verified successfully for order ${orderId}`);

    return json(200, {
      success: true,
      verified: true,
      orderId,
      paymentId: payment.id,
      transactionReference: transactionRef,
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return json(500, { error: errorMessage });
  }
});