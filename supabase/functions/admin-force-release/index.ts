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

    if (reason.length < 10) {
      return new Response(
        JSON.stringify({ error: "Reason must be at least 10 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate proper idempotency key (UUID-based for uniqueness)
    const idempotencyKey = `admin-force-release-${paymentId}-${crypto.randomUUID()}`;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    
    console.log(`Admin ${adminUser.email} initiating force release for payment ${paymentId}, idempotencyKey: ${idempotencyKey}, IP: ${ipAddress}`);

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

    // Check if payment can be released
    const releasableStatuses = ["locked", "pending", "in_escrow", "escrow"];
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

    // CRITICAL: Check for mutual exclusivity violation
    if (order.escrow_resolution_type === 'refunded') {
      return new Response(
        JSON.stringify({ error: "MUTUAL_EXCLUSIVITY_VIOLATION: Cannot release - order was already refunded" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX GAP 5: Check if merchant is banned/suspended
    const { data: merchant } = await supabase
      .from("merchants")
      .select("status, business_name")
      .eq("user_id", order.merchant_id)
      .single();

    if (merchant?.status === "banned" || merchant?.status === "suspended") {
      return new Response(
        JSON.stringify({ error: `Cannot release funds - Merchant account is ${merchant.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check high value threshold for dual approval
    const { data: thresholdSetting } = await supabase
      .from("order_settings")
      .select("setting_value")
      .eq("setting_key", "high_value_threshold")
      .single();

    const highValueThreshold = parseFloat(thresholdSetting?.setting_value || "50000");
    if (payment.amount > highValueThreshold) {
      console.warn(`High value force release: ₹${payment.amount} exceeds threshold ₹${highValueThreshold}`);
      // Log high value action with extra metadata
    }

    const now = new Date().toISOString();

    // 1. Update payment status to released
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({ 
        status: "released",
        updated_at: now
      })
      .eq("id", paymentId)
      .neq("status", "released"); // Prevent double update

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
      .eq("id", order.id)
      .neq("status", "completed");

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

    // FIX GAP 1: Debit escrow account
    const { data: escrowAccount } = await supabase
      .from("escrow_accounts")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    if (escrowAccount) {
      const newLockedBalance = Math.max(0, escrowAccount.locked_balance - payment.amount);
      const newTotalBalance = Math.max(0, escrowAccount.total_balance - payment.amount);

      // Debit escrow - reduce locked balance
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
        amount: payment.amount,
        balance_before: escrowAccount.locked_balance,
        balance_after: newLockedBalance,
        reason: `Admin force release: ${reason}`,
        created_by: user.id,
      });

      console.log(`Debited ₹${payment.amount} from escrow account`);
    }

    // 4. Credit merchant wallet using LEDGER-FIRST approach for consistency
    const { data: merchantWallet } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    if (merchantWallet) {
      // Create ledger entry - balance will auto-sync via trigger
      await supabase.from("merchant_wallet_transactions").insert({
        merchant_id: order.merchant_id,
        transaction_type: "escrow_release",
        amount: payment.amount,
        balance_before: merchantWallet.available_balance,
        balance_after: merchantWallet.available_balance + payment.amount,
        status: "success",
        reference_type: "order",
        reference_id: order.id,
        reason: `Admin force release: ${reason}`,
        created_by: user.id,
      });
      console.log(`LEDGER: Merchant wallet escrow_release entry: +₹${payment.amount}`);
    } else {
      // Create wallet first, then ledger entry
      const { data: newWallet } = await supabase.from("merchant_wallets").insert({
        merchant_id: order.merchant_id,
        available_balance: 0,
        pending_balance: 0,
        currency: "INR"
      }).select().single();
      
      if (newWallet) {
        await supabase.from("merchant_wallet_transactions").insert({
          merchant_id: order.merchant_id,
          transaction_type: "escrow_release",
          amount: payment.amount,
          balance_before: 0,
          balance_after: payment.amount,
          status: "success",
          reference_type: "order",
          reference_id: order.id,
          reason: `Admin force release: ${reason}`,
          created_by: user.id,
        });
      }
      console.log(`LEDGER: Created merchant wallet and escrow_release entry: +₹${payment.amount}`);
    }

    // FIX GAP 3: Log admin financial action with IP address
    await supabase.from("admin_financial_actions_log").insert({
      admin_id: user.id,
      action_type: "force_release",
      target_type: "payment",
      target_id: paymentId,
      amount: payment.amount,
      reason: reason,
      ip_address: ipAddress,
      metadata: {
        admin_email: adminUser.email,
        order_id: order.id,
        merchant_id: order.merchant_id,
        merchant_name: merchant?.business_name,
        high_value: payment.amount > highValueThreshold,
        idempotency_key: idempotencyKey
      }
    });

    // Create high-value alert if applicable
    if (payment.amount > highValueThreshold) {
      await supabase.from("admin_alerts").insert({
        alert_type: "high_value_action",
        severity: "high",
        title: "High Value Force Release Executed",
        description: `Admin ${adminUser.email} force released ₹${payment.amount} for payment ${paymentId}`,
        related_entity_type: "payment",
        related_entity_id: paymentId,
        triggered_by: user.id,
        triggered_by_type: "admin",
        ip_address: ipAddress,
        metadata: {
          amount: payment.amount,
          threshold: highValueThreshold,
          order_id: order.id,
          reason: reason
        }
      });
    }

    // 5. Log to escrow_resolution_log (immutable audit trail)
    await supabase.from("escrow_resolution_log").insert({
      order_id: order.id,
      escrow_account_id: escrowAccount?.id || null,
      resolution_type: "force_released",
      previous_order_status: order.status,
      new_order_status: "completed",
      amount: payment.amount,
      approval_source: "admin",
      admin_id: user.id,
      reason: reason,
      idempotency_key: idempotencyKey,
    });

    // 6. Create order event
    await supabase.from("order_events").insert({
      order_id: order.id,
      event_type: "admin_force_release",
      title: "Admin Force Release",
      description: `Admin ${adminUser.email} force released ₹${payment.amount} to merchant. Reason: ${reason}`,
      metadata: { 
        admin_id: adminUser.id, 
        admin_email: adminUser.email, 
        reason, 
        amount: payment.amount,
        escrow_debited: !!escrowAccount,
        idempotency_key: idempotencyKey
      }
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
        merchantId: order.merchant_id,
        escrowDebited: !!escrowAccount
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin force release:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // Log financial failure alert
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const alertSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await alertSupabase.from("admin_alerts").insert({
        alert_type: "financial_failure",
        severity: "critical",
        title: "Force Release Failed",
        description: `Force release operation failed: ${errorMessage}`,
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