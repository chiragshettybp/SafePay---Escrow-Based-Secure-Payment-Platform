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

    const { disputeId, decision, reason, partialAmount } = await req.json() as DisputeDecisionRequest;

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

    console.log(`Admin ${adminUser.email} making decision on dispute ${disputeId}: ${decision}`);

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

    // Fetch payment
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order.id)
      .single();

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

        // Update order to completed
        await supabase
          .from("orders")
          .update({ status: "completed", completed_at: now, updated_at: now })
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

        // Update order to refunded
        await supabase
          .from("orders")
          .update({ status: "refunded", updated_at: now })
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

        // Update order to completed (partial resolution)
        await supabase
          .from("orders")
          .update({ status: "completed", completed_at: now, updated_at: now })
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

    // FIX GAP 3: Log admin financial action
    await supabase.from("admin_financial_actions_log").insert({
      admin_id: user.id,
      action_type: `dispute_${decision}`,
      target_type: "dispute",
      target_id: disputeId,
      amount: refundAmount || merchantAmount || 0,
      reason: reason,
      metadata: {
        admin_email: adminUser.email,
        order_id: order.id,
        decision,
        refund_amount: refundAmount,
        merchant_amount: merchantAmount,
        escrow_debited: !!escrowAccount && decision !== "resolve_no_funds"
      }
    });

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
        escrow_debited: !!escrowAccount && decision !== "resolve_no_funds"
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});