/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// Verify Razorpay webhook signature
async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = encodeHex(new Uint8Array(signatureBuffer));
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
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
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing server configuration");
    return json(500, { error: "Missing server configuration" });
  }

  if (!webhookSecret) {
    console.error("Missing RAZORPAY_WEBHOOK_SECRET");
    return json(500, { error: "Webhook secret not configured" });
  }

  // Get raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("X-Razorpay-Signature") || "";

  // CRITICAL: Verify webhook signature
  const isValidSignature = await verifyWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValidSignature) {
    console.error("SECURITY: Invalid webhook signature");
    return json(401, { error: "Invalid signature" });
  }

  let payload: {
    event: string;
    payload: {
      payment?: { entity: { id: string; order_id: string; status: string; error_description?: string; amount: number } };
      order?: { entity: { id: string; status: string } };
      refund?: { entity: { id: string; payment_id: string; status: string; amount: number } };
    };
    account_id: string;
    contains: string[];
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Invalid JSON payload");
    return json(400, { error: "Invalid JSON" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const eventType = payload.event;
  const eventId = `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`Processing webhook event: ${eventType}, ID: ${eventId}`);

  // Log webhook event first (for audit trail)
  const { error: logInsertError } = await supabase
    .from("payment_webhook_logs")
    .insert({
      event_type: eventType,
      razorpay_event_id: eventId,
      payload: payload,
      status: "received",
    });

  if (logInsertError) {
    // Check for duplicate (idempotency)
    if (logInsertError.code === "23505") {
      console.log("IDEMPOTENT: Webhook event already processed");
      return json(200, { success: true, message: "Event already processed" });
    }
    console.error("Failed to log webhook:", logInsertError);
  }

  try {
    switch (eventType) {
      case "payment.captured": {
        const paymentEntity = payload.payload.payment?.entity;
        if (!paymentEntity) {
          throw new Error("Missing payment entity");
        }

        const razorpayPaymentId = paymentEntity.id;
        const razorpayOrderId = paymentEntity.order_id;

        console.log(`Processing payment.captured: ${razorpayPaymentId}, order: ${razorpayOrderId}`);

        // Find payment by razorpay_order_id
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .select("id, gateway_status, order_id")
          .eq("razorpay_order_id", razorpayOrderId)
          .single();

        if (paymentError || !payment) {
          console.error("Payment not found for Razorpay order:", razorpayOrderId);
          throw new Error(`Payment not found for Razorpay order: ${razorpayOrderId}`);
        }

        // IDEMPOTENCY: Check if already verified
        if (payment.gateway_status === "verified") {
          console.log("IDEMPOTENT: Payment already verified, ignoring webhook");
          await supabase
            .from("payment_webhook_logs")
            .update({ status: "ignored", processed_at: new Date().toISOString() })
            .eq("razorpay_event_id", eventId);
          return json(200, { success: true, message: "Already verified" });
        }

        // Update payment status to verified
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            gateway_status: "verified",
            razorpay_payment_id: razorpayPaymentId,
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id)
          .neq("gateway_status", "verified"); // Atomic check

        if (updateError) {
          console.error("Failed to update payment:", updateError);
          throw updateError;
        }

        console.log(`Payment ${payment.id} verified via webhook`);

        // Update webhook log
        await supabase
          .from("payment_webhook_logs")
          .update({ 
            status: "processed", 
            payment_id: payment.id,
            processed_at: new Date().toISOString() 
          })
          .eq("razorpay_event_id", eventId);

        break;
      }

      case "payment.failed": {
        const paymentEntity = payload.payload.payment?.entity;
        if (!paymentEntity) {
          throw new Error("Missing payment entity");
        }

        const razorpayOrderId = paymentEntity.order_id;
        const failureReason = paymentEntity.error_description || "Payment failed";

        console.log(`Processing payment.failed: order ${razorpayOrderId}`);

        // Find payment
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .select("id, order_id")
          .eq("razorpay_order_id", razorpayOrderId)
          .single();

        if (paymentError || !payment) {
          console.error("Payment not found for failed payment");
          throw new Error("Payment not found");
        }

        // Update payment to failed
        await supabase
          .from("payments")
          .update({
            gateway_status: "failed",
            gateway_failure_reason: failureReason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        // Ensure order remains in draft (escrow NOT locked)
        await supabase
          .from("orders")
          .update({ status: "draft", updated_at: new Date().toISOString() })
          .eq("id", payment.order_id)
          .eq("status", "draft");

        console.log(`Payment ${payment.id} marked as failed`);

        // Update webhook log
        await supabase
          .from("payment_webhook_logs")
          .update({ 
            status: "processed", 
            payment_id: payment.id,
            processed_at: new Date().toISOString() 
          })
          .eq("razorpay_event_id", eventId);

        break;
      }

      case "order.paid": {
        const orderEntity = payload.payload.order?.entity;
        if (!orderEntity) {
          throw new Error("Missing order entity");
        }

        const razorpayOrderId = orderEntity.id;
        console.log(`Processing order.paid: ${razorpayOrderId}`);

        // This is a redundant confirmation - payment.captured should handle it
        // Just update log as processed
        await supabase
          .from("payment_webhook_logs")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("razorpay_event_id", eventId);

        break;
      }

      case "refund.created":
      case "refund.processed": {
        const refundEntity = payload.payload.refund?.entity;
        if (!refundEntity) {
          throw new Error("Missing refund entity");
        }

        const razorpayRefundId = refundEntity.id;
        const razorpayPaymentId = refundEntity.payment_id;
        const refundStatus = refundEntity.status;

        console.log(`Processing ${eventType}: ${razorpayRefundId}`);

        // Find our refund record
        const { data: refund, error: refundError } = await supabase
          .from("refunds")
          .select("id, status, order_id, amount, payment_id")
          .eq("razorpay_refund_id", razorpayRefundId)
          .single();

        if (!refund) {
          // Refund might have been initiated externally, try to find by payment
          const { data: payment } = await supabase
            .from("payments")
            .select("id, order_id")
            .eq("razorpay_payment_id", razorpayPaymentId)
            .single();

          if (payment) {
            // Create refund record for externally initiated refund
            const refundAmount = refundEntity.amount / 100; // Convert from paise
            await supabase.from("refunds").insert({
              order_id: payment.order_id,
              payment_id: payment.id,
              customer_id: (await supabase.from("payments").select("customer_id").eq("id", payment.id).single()).data?.customer_id,
              amount: refundAmount,
              status: refundStatus === "processed" ? "success" : "processing",
              razorpay_refund_id: razorpayRefundId,
              reason: "Refund via Razorpay",
              initiated_by: "webhook",
            });
            console.log("Created refund record from webhook");
          }
        } else {
          // Update existing refund
          const newStatus = refundStatus === "processed" ? "success" : "processing";
          
          if (refund.status !== newStatus) {
            await supabase
              .from("refunds")
              .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq("id", refund.id);

            // If refund is successful, handle escrow reversal
            if (newStatus === "success" && refund.order_id) {
              console.log(`Processing escrow reversal for refund ${refund.id}`);
              
              // Get order and merchant details
              const { data: order } = await supabase
                .from("orders")
                .select("merchant_id, status")
                .eq("id", refund.order_id)
                .single();

              if (order && order.status !== "refunded") {
                // Update order status
                await supabase
                  .from("orders")
                  .update({ 
                    status: "refunded",
                    escrow_resolution_type: "refund",
                    escrow_finalized_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", refund.order_id);

                // Update payment status
                if (refund.payment_id) {
                  await supabase
                    .from("payments")
                    .update({
                      status: "refunded",
                      is_final: true,
                      updated_at: new Date().toISOString()
                    })
                    .eq("id", refund.payment_id);
                }

                // Update escrow account
                const { data: escrowAccount } = await supabase
                  .from("escrow_accounts")
                  .select("*")
                  .eq("merchant_id", order.merchant_id)
                  .single();

                if (escrowAccount) {
                  const newLockedBalance = Math.max(0, escrowAccount.locked_balance - refund.amount);
                  const newTotalBalance = Math.max(0, escrowAccount.total_balance - refund.amount);

                  await supabase
                    .from("escrow_accounts")
                    .update({
                      locked_balance: newLockedBalance,
                      total_balance: newTotalBalance,
                      updated_at: new Date().toISOString()
                    })
                    .eq("id", escrowAccount.id);

                  // Create escrow transaction
                  await supabase.from("escrow_transactions").insert({
                    escrow_account_id: escrowAccount.id,
                    order_id: refund.order_id,
                    transaction_type: "debit",
                    amount: refund.amount,
                    balance_before: escrowAccount.total_balance,
                    balance_after: newTotalBalance,
                    reason: `Refund processed - ${razorpayRefundId}`,
                  });
                }

                // Create refund event
                await supabase.from("refund_events").insert({
                  refund_id: refund.id,
                  event_type: "refund_completed",
                  title: "Refund Completed",
                  description: `Refund of ₹${refund.amount} has been processed successfully.`,
                });

                console.log(`Escrow reversal completed for refund ${refund.id}`);
              }
            }
          }
        }

        // Update webhook log
        await supabase
          .from("payment_webhook_logs")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("razorpay_event_id", eventId);

        break;
      }

      case "refund.failed": {
        const refundEntity = payload.payload.refund?.entity;
        if (!refundEntity) {
          throw new Error("Missing refund entity");
        }

        const razorpayRefundId = refundEntity.id;
        console.log(`Processing refund.failed: ${razorpayRefundId}`);

        // Update refund status
        const { data: refund } = await supabase
          .from("refunds")
          .select("id")
          .eq("razorpay_refund_id", razorpayRefundId)
          .single();

        if (refund) {
          await supabase
            .from("refunds")
            .update({ 
              status: "failed",
              failure_reason: "Refund failed at payment gateway",
              updated_at: new Date().toISOString()
            })
            .eq("id", refund.id);

          // Create failure event
          await supabase.from("refund_events").insert({
            refund_id: refund.id,
            event_type: "refund_failed",
            title: "Refund Failed",
            description: "The refund could not be processed. Please try again or contact support.",
          });
        }

        // Update webhook log
        await supabase
          .from("payment_webhook_logs")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("razorpay_event_id", eventId);

        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
        await supabase
          .from("payment_webhook_logs")
          .update({ status: "ignored", processed_at: new Date().toISOString() })
          .eq("razorpay_event_id", eventId);
    }

    return json(200, { success: true, event: eventType });

  } catch (error) {
    console.error("Webhook processing error:", error);
    
    // Log error
    await supabase
      .from("payment_webhook_logs")
      .update({ 
        status: "failed", 
        error_message: error instanceof Error ? error.message : "Unknown error",
        processed_at: new Date().toISOString()
      })
      .eq("razorpay_event_id", eventId);

    return json(500, { error: "Webhook processing failed" });
  }
});
