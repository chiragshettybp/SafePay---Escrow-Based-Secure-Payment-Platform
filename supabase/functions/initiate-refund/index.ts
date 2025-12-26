/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitiateRefundRequest {
  paymentId: string;
  reason: string;
  refundType: "full" | "partial";
  refundAmount?: number;
  adminNotes?: string;
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
    console.error("Missing server configuration");
    return json(500, { error: "Missing server configuration" });
  }

  if (!razorpayKeyId || !razorpayKeySecret) {
    console.error("Missing Razorpay configuration");
    return json(500, { error: "Payment gateway not configured" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "Missing authorization header" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify user
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    console.error("Auth error:", userError);
    return json(401, { error: "Unauthorized" });
  }

  let payload: InitiateRefundRequest;
  try {
    payload = (await req.json()) as InitiateRefundRequest;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { paymentId, reason, refundType, refundAmount, adminNotes } = payload;

  if (!paymentId || !reason || !refundType) {
    return json(400, { error: "paymentId, reason, and refundType are required" });
  }

  console.log(`Initiating ${refundType} refund for payment ${paymentId} by user ${user.id}`);

  try {
    // Check if user is admin
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    const isAdmin = !!adminUser;

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*, orders(id, customer_id, merchant_id, amount, status)")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      return json(404, { error: "Payment not found" });
    }

    // Authorization check
    if (!isAdmin && payment.customer_id !== user.id) {
      return json(403, { error: "You can only refund your own payments" });
    }

    // CRITICAL: Validate payment is eligible for refund
    if (payment.gateway_status !== "verified") {
      return json(400, { error: "Payment must be verified before refunding" });
    }

    if (payment.status === "refunded") {
      return json(400, { error: "Payment has already been refunded" });
    }

    if (payment.status === "released" && !isAdmin) {
      return json(400, { error: "Cannot refund released payments. Contact support." });
    }

    // Check for existing pending refund
    const { data: existingRefund } = await supabase
      .from("refunds")
      .select("id, status")
      .eq("payment_id", paymentId)
      .in("status", ["initiated", "processing"])
      .single();

    if (existingRefund) {
      return json(400, { error: "A refund is already in progress for this payment" });
    }

    // Calculate refund amount
    const finalRefundAmount = refundType === "full" 
      ? payment.amount 
      : Math.min(refundAmount || 0, payment.amount);

    if (finalRefundAmount <= 0) {
      return json(400, { error: "Invalid refund amount" });
    }

    if (refundType === "partial" && finalRefundAmount >= payment.amount) {
      return json(400, { error: "Partial refund amount must be less than payment amount" });
    }

    // Get Razorpay payment ID
    if (!payment.razorpay_payment_id) {
      return json(400, { error: "No Razorpay payment ID found. Cannot process refund." });
    }

    // Create refund record first
    const { data: refund, error: refundInsertError } = await supabase
      .from("refunds")
      .insert({
        order_id: payment.order_id,
        payment_id: paymentId,
        customer_id: payment.customer_id,
        amount: finalRefundAmount,
        status: "initiated",
        reason: reason,
        refund_type: refundType,
        initiated_by: isAdmin ? "admin" : "customer",
        admin_id: isAdmin ? user.id : null,
        admin_notes: adminNotes || null,
      })
      .select()
      .single();

    if (refundInsertError || !refund) {
      console.error("Failed to create refund record:", refundInsertError);
      return json(500, { error: "Failed to initiate refund" });
    }

    // Create refund event
    await supabase.from("refund_events").insert({
      refund_id: refund.id,
      event_type: "refund_initiated",
      title: "Refund Initiated",
      description: `${refundType === "full" ? "Full" : "Partial"} refund of ₹${finalRefundAmount} initiated${isAdmin ? " by admin" : ""}.`,
    });

    // Call Razorpay Refund API
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    const refundPayload: { amount: number; notes: Record<string, string>; speed?: string } = {
      amount: Math.round(finalRefundAmount * 100), // Convert to paise
      notes: {
        refund_id: refund.id,
        order_id: payment.order_id,
        reason: reason,
      },
    };

    // Use normal speed for production reliability
    refundPayload.speed = "normal";

    console.log(`Calling Razorpay Refund API for payment ${payment.razorpay_payment_id}`);

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${razorpayAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refundPayload),
      }
    );

    const razorpayData = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error("Razorpay refund failed:", razorpayData);
      
      // Update refund as failed
      await supabase
        .from("refunds")
        .update({ 
          status: "failed",
          failure_reason: razorpayData.error?.description || "Refund failed at gateway",
          updated_at: new Date().toISOString()
        })
        .eq("id", refund.id);

      await supabase.from("refund_events").insert({
        refund_id: refund.id,
        event_type: "refund_failed",
        title: "Refund Failed",
        description: razorpayData.error?.description || "Failed to process refund at payment gateway",
      });

      return json(400, { 
        error: razorpayData.error?.description || "Refund failed",
        refundId: refund.id 
      });
    }

    // Update refund with Razorpay ID
    await supabase
      .from("refunds")
      .update({
        razorpay_refund_id: razorpayData.id,
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", refund.id);

    // Create processing event
    await supabase.from("refund_events").insert({
      refund_id: refund.id,
      event_type: "refund_processing",
      title: "Refund Processing",
      description: `Refund is being processed by Razorpay. Reference: ${razorpayData.id}`,
      metadata: { razorpay_refund_id: razorpayData.id },
    });

    // Log admin action if applicable
    if (isAdmin) {
      await supabase.from("admin_financial_actions_log").insert({
        admin_id: user.id,
        action_type: "initiate_refund",
        target_type: "payment",
        target_id: paymentId,
        amount: finalRefundAmount,
        reason: reason,
        metadata: {
          refund_id: refund.id,
          razorpay_refund_id: razorpayData.id,
          refund_type: refundType,
        },
      });
    }

    // Send notification to customer
    await supabase.from("notifications").insert({
      user_id: payment.customer_id,
      title: "Refund Initiated",
      message: `Your refund of ₹${finalRefundAmount} is being processed. It will be credited within 5-7 business days.`,
      type: "refund",
      order_id: payment.order_id,
    });

    console.log(`Refund ${refund.id} initiated successfully with Razorpay ID: ${razorpayData.id}`);

    return json(200, {
      success: true,
      refundId: refund.id,
      razorpayRefundId: razorpayData.id,
      amount: finalRefundAmount,
      status: "processing",
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return json(500, { error: errorMessage });
  }
});
