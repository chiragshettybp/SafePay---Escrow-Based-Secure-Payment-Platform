import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DecisionType = 
  | "release_to_merchant" 
  | "refund_customer" 
  | "partial_refund" 
  | "resolve_no_funds";

interface DisputeDecisionRequest {
  disputeId: string;
  decision: DecisionType;
  reason: string;
  partialAmount?: number;
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

    const { disputeId, decision, reason, partialAmount, idempotencyKey: clientIdempotencyKey } = await req.json() as DisputeDecisionRequest & { idempotencyKey?: string };

    if (!disputeId || !decision || !reason) {
      return new Response(
        JSON.stringify({ error: "disputeId, decision, and reason are required" }),
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
    const idempotencyKey = clientIdempotencyKey || `admin-dispute-${disputeId}-${decision}-${crypto.randomUUID()}`;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    console.log(`Admin ${adminUser.email} making decision on dispute ${disputeId}: ${decision}, idempotencyKey: ${idempotencyKey}, IP: ${ipAddress}`);

    // CRITICAL: Idempotency check - has this resolution already been processed?
    const { data: existingResolution } = await supabase
      .from("escrow_resolution_log")
      .select("*")
      .eq("order_id", disputeId) // We'll also check by actual order_id below
      .maybeSingle();

    // Fetch dispute with order and payment
    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .select("*, orders(*)")
      .eq("id", disputeId)
      .single();

    if (disputeError || !dispute) {
      console.error("Dispute not found:", disputeError);
      return new Response(
        JSON.stringify({ error: "Dispute not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check dispute is actionable
    const actionableStatuses = ["open", "under_review"];
    if (!actionableStatuses.includes(dispute.status)) {
      // Idempotent return if already resolved
      if (dispute.status === "resolved" || dispute.status === "closed") {
        console.log(`Idempotent return: Dispute ${disputeId} already ${dispute.status}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Dispute already ${dispute.status}`,
            alreadyResolved: true,
            finalDecision: dispute.final_decision
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Cannot modify dispute with status: ${dispute.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = dispute.orders;
    if (!order) {
      return new Response(
        JSON.stringify({ error: "Associated order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL: Check if order escrow is already finalized (mutual exclusivity)
    if (order.escrow_resolution_type) {
      console.log(`Idempotent return: Order ${order.id} escrow already finalized as ${order.escrow_resolution_type}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Order escrow already finalized as ${order.escrow_resolution_type}`,
          alreadyResolved: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch payment
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order.id)
      .single();

    // CRITICAL: Check if payment is already finalized
    if (payment?.is_final === true) {
      console.log(`Idempotent return: Payment for order ${order.id} already finalized`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment already finalized",
          alreadyResolved: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch escrow account for balance updates
    const { data: escrowAccount } = await supabase
      .from("escrow_accounts")
      .select("*")
      .eq("merchant_id", order.merchant_id)
      .single();

    const now = new Date().toISOString();
    let finalDecision = "";
    let refundAmount = 0;
    let merchantAmount = 0;

    // Helper function to debit escrow
    const debitEscrow = async (amount: number, txReason: string) => {
      if (!escrowAccount) return;
      
      const newLockedBalance = Math.max(0, escrowAccount.locked_balance - amount);
      const newTotalBalance = Math.max(0, escrowAccount.total_balance - amount);

      await supabase
        .from("escrow_accounts")
        .update({
          locked_balance: newLockedBalance,
          total_balance: newTotalBalance,
          updated_at: now
        })
        .eq("id", escrowAccount.id);

      await supabase.from("escrow_transactions").insert({
        escrow_account_id: escrowAccount.id,
        order_id: order.id,
        transaction_type: "debit",
        amount: amount,
        balance_before: escrowAccount.locked_balance,
        balance_after: newLockedBalance,
        reason: txReason,
        created_by: user.id,
      });

      console.log(`Debited ₹${amount} from escrow: ${txReason}`);
    };

    // Helper function to credit customer wallet
    const creditCustomerWallet = async (amount: number, refundId?: string) => {
      const { data: customerWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("customer_id", order.customer_id)
        .single();

      if (customerWallet) {
        const newBalance = customerWallet.balance + amount;
        
        await supabase
          .from("wallets")
          .update({ balance: newBalance, updated_at: now })
          .eq("id", customerWallet.id);

        await supabase.from("wallet_transactions").insert({
          wallet_id: customerWallet.id,
          customer_id: order.customer_id,
          transaction_type: "refund",
          amount: amount,
          balance_before: customerWallet.balance,
          balance_after: newBalance,
          reference_type: "dispute",
          reference_id: refundId || disputeId,
          description: `Dispute resolution refund for order #${order.id.slice(0, 8)}`,
          status: "completed"
        });
      } else {
        const { data: newWallet } = await supabase
          .from("wallets")
          .insert({
            customer_id: order.customer_id,
            balance: amount,
            currency: "INR"
          })
          .select()
          .single();

        if (newWallet) {
          await supabase.from("wallet_transactions").insert({
            wallet_id: newWallet.id,
            customer_id: order.customer_id,
            transaction_type: "refund",
            amount: amount,
            balance_before: 0,
            balance_after: amount,
            reference_type: "dispute",
            reference_id: refundId || disputeId,
            description: `Dispute resolution refund for order #${order.id.slice(0, 8)}`,
            status: "completed"
          });
        }
      }
      console.log(`Credited ₹${amount} to customer wallet`);
    };

    // Process decision
    switch (decision) {
      case "release_to_merchant":
        finalDecision = "Funds released to merchant";
        merchantAmount = order.amount;

        // Update payment status
        if (payment) {
          await supabase
            .from("payments")
            .update({ status: "released", updated_at: now })
            .eq("id", payment.id);
        }

        // Update order to completed with admin finalization marker
        await supabase
          .from("orders")
          .update({ 
            status: "completed", 
            completed_at: now, 
            updated_at: now,
            escrow_resolution_type: "released",
            escrow_finalized_at: now,
            escrow_finalized_by: user.id
          })
          .eq("id", order.id);

        // FIX GAP 2: Debit escrow and credit merchant wallet
        await debitEscrow(order.amount, `Dispute resolved - released to merchant: ${reason}`);

        // Credit merchant wallet
        const { data: merchantWallet } = await supabase
          .from("merchant_wallets")
          .select("*")
          .eq("merchant_id", order.merchant_id)
          .single();

        if (merchantWallet) {
          await supabase
            .from("merchant_wallets")
            .update({
              available_balance: merchantWallet.available_balance + order.amount,
              updated_at: now
            })
            .eq("id", merchantWallet.id);
        } else {
          await supabase.from("merchant_wallets").insert({
            merchant_id: order.merchant_id,
            available_balance: order.amount,
            currency: "INR"
          });
        }

        // Notify merchant
        await supabase.from("merchant_notifications").insert({
          merchant_id: order.merchant_id,
          title: "Dispute Resolved - Funds Released",
          body: `Dispute for order #${order.id.slice(0, 8)} resolved in your favor. ₹${order.amount} credited.`,
          type: "dispute",
          priority: "high",
          related_order_id: order.id,
          related_dispute_id: disputeId,
        });

        // Notify customer
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          title: "Dispute Resolved",
          message: `Your dispute for order #${order.id.slice(0, 8)} has been resolved. Funds released to merchant.`,
          type: "dispute",
          order_id: order.id,
        });
        break;

      case "refund_customer":
        finalDecision = "Full refund to customer";
        refundAmount = order.amount;

        // Update payment status
        if (payment) {
          await supabase
            .from("payments")
            .update({ status: "refunded", updated_at: now })
            .eq("id", payment.id);
        }

        // Update order to refunded with admin finalization marker
        await supabase
          .from("orders")
          .update({ 
            status: "refunded", 
            updated_at: now,
            escrow_resolution_type: "refunded",
            escrow_finalized_at: now,
            escrow_finalized_by: user.id
          })
          .eq("id", order.id);

        // Create refund record
        const { data: fullRefund } = await supabase.from("refunds").insert({
          order_id: order.id,
          customer_id: order.customer_id,
          dispute_id: disputeId,
          amount: refundAmount,
          reason: `Dispute resolved: ${reason}`,
          status: "completed",
          credited_at: now,
        }).select().single();

        // FIX GAP 2: Debit escrow
        await debitEscrow(refundAmount, `Dispute resolved - refund to customer: ${reason}`);

        // Credit customer wallet
        await creditCustomerWallet(refundAmount, fullRefund?.id);

        // Notify customer
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          title: "Dispute Resolved - Full Refund",
          message: `Your dispute resolved. ₹${refundAmount} refunded to your wallet.`,
          type: "refund",
          order_id: order.id,
        });

        // Notify merchant
        await supabase.from("merchant_notifications").insert({
          merchant_id: order.merchant_id,
          title: "Dispute Resolved - Customer Refunded",
          body: `Dispute for order #${order.id.slice(0, 8)} resolved. Customer refunded ₹${refundAmount}.`,
          type: "dispute",
          priority: "high",
          related_order_id: order.id,
          related_dispute_id: disputeId,
        });
        break;

      case "partial_refund":
        if (!partialAmount || partialAmount <= 0 || partialAmount > order.amount) {
          return new Response(
            JSON.stringify({ error: "Invalid partial refund amount" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        finalDecision = `Partial refund of ₹${partialAmount} to customer`;
        refundAmount = partialAmount;
        merchantAmount = order.amount - partialAmount;

        // Update payment status
        if (payment) {
          await supabase
            .from("payments")
            .update({ status: "released", updated_at: now })
            .eq("id", payment.id);
        }

        // Update order to completed (partial resolution) with admin finalization marker
        await supabase
          .from("orders")
          .update({ 
            status: "completed", 
            completed_at: now, 
            updated_at: now,
            escrow_resolution_type: "partial_refund",
            escrow_finalized_at: now,
            escrow_finalized_by: user.id
          })
          .eq("id", order.id);

        // Create refund record for partial amount
        const { data: partialRefund } = await supabase.from("refunds").insert({
          order_id: order.id,
          customer_id: order.customer_id,
          dispute_id: disputeId,
          amount: refundAmount,
          reason: `Partial refund - Dispute resolved: ${reason}`,
          status: "completed",
          credited_at: now,
        }).select().single();

        // FIX GAP 2: Debit full amount from escrow
        await debitEscrow(order.amount, `Dispute resolved - partial refund: ${reason}`);

        // Credit customer wallet (partial)
        await creditCustomerWallet(refundAmount, partialRefund?.id);

        // Credit merchant wallet (remaining)
        const { data: merchWallet } = await supabase
          .from("merchant_wallets")
          .select("*")
          .eq("merchant_id", order.merchant_id)
          .single();

        if (merchWallet) {
          await supabase
            .from("merchant_wallets")
            .update({
              available_balance: merchWallet.available_balance + merchantAmount,
              updated_at: now
            })
            .eq("id", merchWallet.id);
        } else {
          await supabase.from("merchant_wallets").insert({
            merchant_id: order.merchant_id,
            available_balance: merchantAmount,
            currency: "INR"
          });
        }

        // Notify both parties
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          title: "Dispute Resolved - Partial Refund",
          message: `Your dispute resolved with ₹${refundAmount} partial refund.`,
          type: "refund",
          order_id: order.id,
        });

        await supabase.from("merchant_notifications").insert({
          merchant_id: order.merchant_id,
          title: "Dispute Resolved - Partial",
          body: `Dispute resolved. ₹${merchantAmount} credited after ₹${refundAmount} customer refund.`,
          type: "dispute",
          priority: "high",
          related_order_id: order.id,
          related_dispute_id: disputeId,
        });
        break;

      case "resolve_no_funds":
        finalDecision = "Resolved without fund movement";
        
        // Just close the dispute without moving funds
        // Order stays in current status
        
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          title: "Dispute Resolved",
          message: `Your dispute for order #${order.id.slice(0, 8)} has been reviewed and closed.`,
          type: "dispute",
          order_id: order.id,
        });

        await supabase.from("merchant_notifications").insert({
          merchant_id: order.merchant_id,
          title: "Dispute Closed",
          body: `Dispute for order #${order.id.slice(0, 8)} has been closed by admin.`,
          type: "dispute",
          related_order_id: order.id,
          related_dispute_id: disputeId,
        });
        break;
    }

    // Update dispute status
    await supabase
      .from("disputes")
      .update({
        status: "resolved",
        final_decision: finalDecision,
        resolution_notes: reason,
        refund_amount: refundAmount,
        updated_at: now
      })
      .eq("id", disputeId);

    // Add dispute update entry
    await supabase.from("dispute_updates").insert({
      dispute_id: disputeId,
      title: "Dispute Resolved by Admin",
      description: `${finalDecision}. Reason: ${reason}`,
      status: "resolved",
      created_by: adminUser.email,
    });

    // FIX GAP 3: Log admin financial action with IP address
    const actionAmount = refundAmount || merchantAmount || 0;
    await supabase.from("admin_financial_actions_log").insert({
      admin_id: user.id,
      action_type: `dispute_${decision}`,
      target_type: "dispute",
      target_id: disputeId,
      amount: actionAmount,
      reason: reason,
      ip_address: ipAddress,
      metadata: {
        admin_email: adminUser.email,
        order_id: order.id,
        decision,
        refund_amount: refundAmount,
        merchant_amount: merchantAmount,
        escrow_debited: !!escrowAccount && decision !== "resolve_no_funds",
        idempotency_key: idempotencyKey
      }
    });

    // Check high value threshold for alerts
    const { data: thresholdSetting } = await supabase
      .from("order_settings")
      .select("setting_value")
      .eq("setting_key", "high_value_threshold")
      .single();
    const highValueThreshold = parseFloat(thresholdSetting?.setting_value || "50000");

    // Create high-value alert if applicable
    if (actionAmount > highValueThreshold) {
      await supabase.from("admin_alerts").insert({
        alert_type: "high_value_action",
        severity: "high",
        title: "High Value Dispute Decision Executed",
        description: `Admin ${adminUser.email} made ${decision} decision for ₹${actionAmount} on dispute ${disputeId}`,
        related_entity_type: "dispute",
        related_entity_id: disputeId,
        triggered_by: user.id,
        triggered_by_type: "admin",
        ip_address: ipAddress,
        metadata: {
          amount: actionAmount,
          threshold: highValueThreshold,
          order_id: order.id,
          decision: decision,
          reason: reason
        }
      });
    }

    // Log to escrow_resolution_log for audit trail (if funds were moved)
    if (decision !== "resolve_no_funds") {
      const resolutionType = decision === "refund_customer" ? "refunded" 
        : decision === "partial_refund" ? "partial_refund" 
        : "released";
      
      await supabase.from("escrow_resolution_log").insert({
        order_id: order.id,
        escrow_account_id: escrowAccount?.id || null,
        resolution_type: resolutionType,
        previous_order_status: order.status,
        new_order_status: decision === "refund_customer" ? "refunded" : "completed",
        amount: order.amount,
        approval_source: "admin",
        admin_id: user.id,
        reason: `Admin dispute decision: ${reason}`,
        idempotency_key: idempotencyKey,
      });
    }

    // Mark payment as final to prevent any further modifications
    if (payment && decision !== "resolve_no_funds") {
      await supabase
        .from("payments")
        .update({ is_final: true, updated_at: now })
        .eq("id", payment.id);
    }

    // Create order event
    await supabase.from("order_events").insert({
      order_id: order.id,
      event_type: "admin_dispute_decision",
      title: "Admin Dispute Decision",
      description: `${finalDecision} by admin ${adminUser.email}`,
      metadata: {
        admin_id: adminUser.id,
        admin_email: adminUser.email,
        decision,
        reason,
        refund_amount: refundAmount,
        merchant_amount: merchantAmount,
        escrow_debited: !!escrowAccount && decision !== "resolve_no_funds",
        idempotency_key: idempotencyKey
      }
    });

    console.log(`Dispute ${disputeId} resolved: ${finalDecision}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dispute resolved successfully",
        disputeId,
        decision: finalDecision,
        refundAmount,
        merchantAmount,
        escrowDebited: !!escrowAccount && decision !== "resolve_no_funds"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin dispute decision:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // Log financial failure alert
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const alertSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await alertSupabase.from("admin_alerts").insert({
        alert_type: "financial_failure",
        severity: "critical",
        title: "Dispute Decision Failed",
        description: `Dispute decision operation failed: ${errorMessage}`,
        related_entity_type: "dispute",
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