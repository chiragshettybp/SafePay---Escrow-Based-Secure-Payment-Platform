import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Auto-confirm orders after X days with idempotency and ledger-first approach
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

    // Find eligible orders
    const { data: eligibleOrders, error: queryError } = await supabase
      .from("orders")
      .select(`
        id,
        customer_id,
        merchant_id,
        amount,
        delivered_at,
        status,
        escrow_resolution_type,
        disputes!left(id, status)
      `)
      .eq("status", "delivered")
      .is("escrow_resolution_type", null)
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
      // Generate idempotency key
      const idempotencyKey = `auto-confirm-${order.id}-${autoConfirmDays}`;

      // Check if already processed (idempotency)
      const { data: existingResolution } = await supabase
        .from("escrow_resolution_log")
        .select("id")
        .eq("order_id", order.id)
        .eq("resolution_type", "released")
        .maybeSingle();

      if (existingResolution) {
        console.log(`Skipping order ${order.id} - already processed (idempotent)`);
        skippedCount++;
        continue;
      }

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
        continue;
      }

      try {
        // ATOMIC: Update order status with optimistic lock
        const { error: updateError, data: updatedOrder } = await supabase
          .from("orders")
          .update({
            status: "completed",
            completed_at: now,
            updated_at: now
          })
          .eq("id", order.id)
          .eq("status", "delivered")
          .select()
          .single();

        if (updateError || !updatedOrder) {
          console.log(`Skipping order ${order.id} - status changed (race condition)`);
          skippedCount++;
          continue;
        }

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

        // LEDGER-FIRST: Credit merchant wallet via ledger entry
        await supabase.from("merchant_wallet_transactions").insert({
          merchant_id: order.merchant_id,
          transaction_type: "escrow_release",
          amount: order.amount,
          balance_before: 0,
          balance_after: order.amount,
          status: "success",
          reference_type: "order",
          reference_id: order.id,
          reason: `Auto-confirmed after ${autoConfirmDays} days`,
        });

        // Log to escrow_resolution_log (immutable audit trail)
        await supabase.from("escrow_resolution_log").insert({
          order_id: order.id,
          escrow_account_id: escrowAccount?.id || null,
          resolution_type: "released",
          previous_order_status: "delivered",
          new_order_status: "completed",
          amount: order.amount,
          approval_source: "system",
          reason: `Auto-confirmed after ${autoConfirmDays} days`,
          idempotency_key: idempotencyKey,
        });

        // Create order event
        await supabase.from("order_events").insert({
          order_id: order.id,
          event_type: "auto_confirmed",
          title: "Order Auto-Confirmed",
          description: `Order automatically confirmed after ${autoConfirmDays} days. Payment released to merchant.`,
          metadata: { auto_confirm_days: autoConfirmDays, idempotency_key: idempotencyKey }
        });

        // Notify customer and merchant
        await Promise.all([
          supabase.from("notifications").insert({
            user_id: order.customer_id,
            title: "Order Auto-Confirmed",
            message: `Your order #${order.id.slice(0, 8)} has been automatically confirmed after ${autoConfirmDays} days.`,
            type: "order",
            order_id: order.id,
          }),
          supabase.from("merchant_notifications").insert({
            merchant_id: order.merchant_id,
            title: "Payment Auto-Released",
            body: `Payment of ₹${order.amount} for order #${order.id.slice(0, 8)} has been auto-released.`,
            type: "payment",
            related_order_id: order.id,
            priority: "normal",
          })
        ]);

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
