import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// FIX GAP 6: Auto-confirm orders after X days
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting auto-confirm orders job...");

    // Get auto-confirm days setting
    const { data: setting } = await supabase
      .from("order_settings")
      .select("setting_value")
      .eq("setting_key", "auto_confirm_days")
      .single();

    const autoConfirmDays = parseInt(setting?.setting_value || "7");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoConfirmDays);

    console.log(`Auto-confirming orders delivered before ${cutoffDate.toISOString()}`);

    // Find orders that should be auto-confirmed:
    // - Status is 'delivered'
    // - No open disputes
    // - Delivered more than X days ago
    const { data: eligibleOrders, error: queryError } = await supabase
      .from("orders")
      .select(`
        id,
        customer_id,
        merchant_id,
        amount,
        delivered_at,
        disputes!left(id, status)
      `)
      .eq("status", "delivered")
      .lt("delivered_at", cutoffDate.toISOString());

    if (queryError) {
      console.error("Error fetching eligible orders:", queryError);
      throw queryError;
    }

    if (!eligibleOrders || eligibleOrders.length === 0) {
      console.log("No orders eligible for auto-confirmation");
      return new Response(
        JSON.stringify({ success: true, message: "No orders to auto-confirm", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let confirmedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();

    for (const order of eligibleOrders) {
      // Check for open disputes
      const hasOpenDispute = order.disputes?.some(
        (d: { status: string }) => d.status === "open" || d.status === "under_review"
      );

      if (hasOpenDispute) {
        console.log(`Skipping order ${order.id} - has open dispute`);
        skippedCount++;
        continue;
      }

      // Check if merchant is active
      const { data: merchant } = await supabase
        .from("merchants")
        .select("status")
        .eq("user_id", order.merchant_id)
        .single();

      if (merchant?.status === "banned" || merchant?.status === "suspended") {
        console.log(`Skipping order ${order.id} - merchant is ${merchant.status}`);
        skippedCount++;

        // Notify admin about this
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          title: "Order Auto-Confirmation Delayed",
          message: `Your order #${order.id.slice(0, 8)} could not be auto-confirmed. Please contact support.`,
          type: "order",
          order_id: order.id,
        });

        continue;
      }

      try {
        // Update order status
        await supabase
          .from("orders")
          .update({
            status: "completed",
            completed_at: now,
            updated_at: now
          })
          .eq("id", order.id)
          .eq("status", "delivered"); // Optimistic lock

        // Update payment
        await supabase
          .from("payments")
          .update({ status: "released", updated_at: now })
          .eq("order_id", order.id)
          .neq("status", "released");

        // Debit escrow
        const { data: escrowAccount } = await supabase
          .from("escrow_accounts")
          .select("*")
          .eq("merchant_id", order.merchant_id)
          .single();

        if (escrowAccount) {
          const newLockedBalance = Math.max(0, escrowAccount.locked_balance - order.amount);
          const newTotalBalance = Math.max(0, escrowAccount.total_balance - order.amount);

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
            amount: order.amount,
            balance_before: escrowAccount.locked_balance,
            balance_after: newLockedBalance,
            reason: `Auto-confirmed after ${autoConfirmDays} days`,
          });
        }

        // Credit merchant wallet
        const { data: wallet } = await supabase
          .from("merchant_wallets")
          .select("*")
          .eq("merchant_id", order.merchant_id)
          .single();

        if (wallet) {
          await supabase
            .from("merchant_wallets")
            .update({
              available_balance: wallet.available_balance + order.amount,
              updated_at: now
            })
            .eq("id", wallet.id);
        } else {
          await supabase.from("merchant_wallets").insert({
            merchant_id: order.merchant_id,
            available_balance: order.amount,
            currency: "INR"
          });
        }

        // Create order event
        await supabase.from("order_events").insert({
          order_id: order.id,
          event_type: "auto_confirmed",
          title: "Order Auto-Confirmed",
          description: `Order automatically confirmed after ${autoConfirmDays} days. Payment released to merchant.`,
          metadata: { auto_confirm_days: autoConfirmDays }
        });

        // Notify customer
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          title: "Order Auto-Confirmed",
          message: `Your order #${order.id.slice(0, 8)} has been automatically confirmed after ${autoConfirmDays} days. Payment released to merchant.`,
          type: "order",
          order_id: order.id,
        });

        // Notify merchant
        await supabase.from("merchant_notifications").insert({
          merchant_id: order.merchant_id,
          title: "Payment Auto-Released",
          body: `Payment of ₹${order.amount} for order #${order.id.slice(0, 8)} has been auto-released to your wallet.`,
          type: "payment",
          related_order_id: order.id,
          priority: "normal",
        });

        confirmedCount++;
        console.log(`Auto-confirmed order ${order.id}`);

      } catch (orderError) {
        console.error(`Failed to auto-confirm order ${order.id}:`, orderError);
        skippedCount++;
      }
    }

    console.log(`Auto-confirm job completed. Confirmed: ${confirmedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-confirmed ${confirmedCount} orders`,
        confirmed: confirmedCount,
        skipped: skippedCount,
        totalEligible: eligibleOrders.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in auto-confirm job:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});