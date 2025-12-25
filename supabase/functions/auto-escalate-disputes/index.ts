import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TC-DISP-05: Auto-escalate disputes when merchant doesn't respond within 48 hours
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting auto-escalate disputes job...");

    const escalationHours = 48;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - escalationHours);

    console.log(`Escalating disputes created before ${cutoffDate.toISOString()} without merchant response`);

    // Find disputes that should be escalated:
    // - Status is 'open'
    // - No merchant response exists
    // - Created more than 48 hours ago
    const { data: eligibleDisputes, error: queryError } = await supabase
      .from("disputes")
      .select(`
        id,
        order_id,
        customer_id,
        created_at,
        dispute_responses!left(id)
      `)
      .eq("status", "open")
      .lt("created_at", cutoffDate.toISOString());

    if (queryError) {
      console.error("Error fetching eligible disputes:", queryError);
      throw queryError;
    }

    if (!eligibleDisputes || eligibleDisputes.length === 0) {
      console.log("No disputes eligible for escalation");
      return new Response(
        JSON.stringify({ success: true, message: "No disputes to escalate", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let escalatedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();

    for (const dispute of eligibleDisputes) {
      // Check if merchant has responded
      const hasResponse = dispute.dispute_responses && dispute.dispute_responses.length > 0;

      if (hasResponse) {
        console.log(`Skipping dispute ${dispute.id} - merchant has responded`);
        skippedCount++;
        continue;
      }

      try {
        // Update dispute status to under_review (escalated)
        await supabase
          .from("disputes")
          .update({
            status: "under_review",
            updated_at: now
          })
          .eq("id", dispute.id)
          .eq("status", "open"); // Optimistic lock

        // Create dispute update record
        await supabase.from("dispute_updates").insert({
          dispute_id: dispute.id,
          title: "Dispute Escalated",
          description: "Dispute has been automatically escalated to admin review due to no merchant response within 48 hours.",
          status: "under_review",
          created_by: "system"
        });

        // Get order details for notification
        const { data: order } = await supabase
          .from("orders")
          .select("merchant_id, merchant_name")
          .eq("id", dispute.order_id)
          .single();

        // Notify customer
        await supabase.from("notifications").insert({
          user_id: dispute.customer_id,
          title: "Dispute Escalated",
          message: `Your dispute has been escalated to admin review due to no response from the merchant.`,
          type: "dispute",
          order_id: dispute.order_id
        });

        // Notify merchant with warning
        if (order) {
          await supabase.from("merchant_notifications").insert({
            merchant_id: order.merchant_id,
            title: "Dispute Escalated - Urgent",
            body: `A dispute has been escalated to admin review because no response was provided within 48 hours. This may affect your account standing.`,
            type: "dispute",
            priority: "high",
            related_order_id: dispute.order_id,
            related_dispute_id: dispute.id
          });
        }

        console.log(`Escalated dispute ${dispute.id}`);
        escalatedCount++;
      } catch (err) {
        console.error(`Failed to escalate dispute ${dispute.id}:`, err);
      }
    }

    console.log(`Auto-escalate complete. Escalated: ${escalatedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Escalated ${escalatedCount} disputes`,
        escalated: escalatedCount,
        skipped: skippedCount
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in auto-escalate-disputes:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
