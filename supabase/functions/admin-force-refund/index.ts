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

    if (reason.length < 10) {
      return new Response(
        JSON.stringify({ error: "Reason must be at least 10 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate proper idempotency key (UUID-based for uniqueness)
    const idempotencyKey = `admin-force-refund-${paymentId}-${crypto.randomUUID()}`;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    
    console.log(`Admin ${adminUser.email} initiating force refund for payment ${paymentId}, idempotencyKey: ${idempotencyKey}, IP: ${ipAddress}`);

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

    // CRITICAL: Check if payment is already finalized
    if (payment.is_final === true) {
      console.log("Payment already finalized, returning idempotent success");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Payment already ${payment.status}`,
          alreadyFinalized: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if payment can be refunded
    const refundableStatuses = ["locked", "pending", "in_escrow", "escrow"];
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

    // CRITICAL: Check for mutual exclusivity violation
    if (order.escrow_resolution_type === 'released') {
      return new Response(
        JSON.stringify({ error: "MUTUAL_EXCLUSIVITY_VIOLATION: Cannot refund - order was already released to merchant" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Check high value threshold
    const { data: thresholdSetting } = await supabase
      .from("order_settings")
      .select("setting_value")
      .eq("setting_key", "high_value_threshold")
      .single();

    const highValueThreshold = parseFloat(thresholdSetting?.setting_value || "50000");
    if (actualRefundAmount > highValueThreshold) {
      console.warn(`High value force refund: ₹${actualRefundAmount} exceeds threshold ₹${highValueThreshold}`);
    }

    const now = new Date().toISOString();

    // 1. Update payment status to refunded
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({ 
        status: "refunded",
        updated_at: now
      })
      .eq("id", paymentId)
      .neq("status", "refunded"); // Prevent double update

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
      .eq("id", order.id)
      .neq("status", "refunded");

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

    // FIX GAP 1: Debit escrow account
    const { data: escrowAccount } = await supabase
      .from("escrow_accounts")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    if (escrowAccount) {
      const newLockedBalance = Math.max(0, escrowAccount.locked_balance - actualRefundAmount);
      const newTotalBalance = Math.max(0, escrowAccount.total_balance - actualRefundAmount);

      // Debit escrow - reduce locked balance for refund
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

      // Create escrow transaction record for the debit
      await supabase.from("escrow_transactions").insert({
        escrow_account_id: escrowAccount.id,
        order_id: order.id,
        transaction_type: "debit",
        amount: actualRefundAmount,
        balance_before: escrowAccount.locked_balance,
        balance_after: newLockedBalance,
        reason: `Admin force refund: ${reason}`,
        created_by: user.id,
      });

      console.log(`Debited ₹${actualRefundAmount} from escrow account for refund`);
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
        payment_method: "wallet",
      })
      .select()
      .single();

    if (refundError) {
      console.error("Failed to create refund record:", refundError);
    }

    // 5. Credit customer wallet using LEDGER-FIRST approach
    const { data: customerWallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("customer_id", order.customer_id)
      .single();

    if (customerWallet) {
      // Create ledger entry - balance will auto-sync via trigger
      await supabase.from("wallet_transactions").insert({
        wallet_id: customerWallet.id,
        customer_id: order.customer_id,
        type: "refund",
        amount: actualRefundAmount,
        reference_type: "refund",
        reference_id: refundRecord?.id,
        description: `Admin force refund for order #${order.id.slice(0, 8)}`,
        status: "success"
      });

      console.log(`LEDGER: Credited ₹${actualRefundAmount} to customer wallet via ledger`);

      if (refundRecord) {
        await supabase
          .from("refunds")
          .update({ status: "completed", credited_at: now })
          .eq("id", refundRecord.id);
      }
    } else {
      // Create wallet first, then ledger entry
      const { data: newWallet } = await supabase
        .from("wallets")
        .insert({
          customer_id: order.customer_id,
          balance: 0,
          currency: "INR"
        })
        .select()
        .single();

      if (newWallet) {
        await supabase.from("wallet_transactions").insert({
          wallet_id: newWallet.id,
          customer_id: order.customer_id,
          type: "refund",
          amount: actualRefundAmount,
          reference_type: "refund",
          reference_id: refundRecord?.id,
          description: `Admin force refund for order #${order.id.slice(0, 8)}`,
          status: "success"
        });
      }

      console.log(`LEDGER: Created wallet and credited ₹${actualRefundAmount} via ledger`);
    }

    // FIX GAP 3: Log admin financial action with IP address
    await supabase.from("admin_financial_actions_log").insert({
      admin_id: user.id,
      action_type: "force_refund",
      target_type: "payment",
      target_id: paymentId,
      amount: actualRefundAmount,
      reason: reason,
      ip_address: ipAddress,
      metadata: {
        admin_email: adminUser.email,
        order_id: order.id,
        customer_id: order.customer_id,
        refund_type: refundType,
        high_value: actualRefundAmount > highValueThreshold,
        escrow_debited: !!escrowAccount,
        idempotency_key: idempotencyKey
      }
    });

    // Create high-value alert if applicable
    if (actualRefundAmount > highValueThreshold) {
      await supabase.from("admin_alerts").insert({
        alert_type: "high_value_action",
        severity: "high",
        title: "High Value Force Refund Executed",
        description: `Admin ${adminUser.email} force refunded ₹${actualRefundAmount} for payment ${paymentId}`,
        related_entity_type: "payment",
        related_entity_id: paymentId,
        triggered_by: user.id,
        triggered_by_type: "admin",
        ip_address: ipAddress,
        metadata: {
          amount: actualRefundAmount,
          threshold: highValueThreshold,
          order_id: order.id,
          refund_type: refundType,
          reason: reason
        }
      });
    }

    // 6. Log to escrow_resolution_log (immutable audit trail)
    await supabase.from("escrow_resolution_log").insert({
      order_id: order.id,
      escrow_account_id: escrowAccount?.id || null,
      resolution_type: "force_refunded",
      previous_order_status: order.status,
      new_order_status: "refunded",
      amount: actualRefundAmount,
      approval_source: "admin",
      admin_id: user.id,
      reason: reason,
      idempotency_key: idempotencyKey,
    });

    // 7. Create order event
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
        amount: actualRefundAmount,
        escrow_debited: !!escrowAccount,
        idempotency_key: idempotencyKey
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
        customerId: order.customer_id,
        escrowDebited: !!escrowAccount
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin force refund:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // Log financial failure alert
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const alertSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await alertSupabase.from("admin_alerts").insert({
        alert_type: "financial_failure",
        severity: "critical",
        title: "Force Refund Failed",
        description: `Force refund operation failed: ${errorMessage}`,
        related_entity_type: "payment",
        triggered_by_type: "system",
        metadata: {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    } catch (alertError) {
      console.error("Failed to create failure alert:", alertError);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});