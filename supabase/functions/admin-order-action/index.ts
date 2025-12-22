import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Access denied. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orderId, action, newStatus, reason, note } = await req.json();

    if (!orderId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the current order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      case "update_status": {
        if (!newStatus) {
          return new Response(
            JSON.stringify({ error: "New status is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const oldStatus = order.status;

        // Update order status
        const { error: updateError } = await supabase
          .from("orders")
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId);

        if (updateError) throw updateError;

        // Create order event
        await supabase.from("order_events").insert({
          order_id: orderId,
          event_type: "admin_status_change",
          title: `Status changed to ${newStatus}`,
          description: reason || `Admin changed status from ${oldStatus} to ${newStatus}`,
          metadata: {
            old_status: oldStatus,
            new_status: newStatus,
            admin_id: user.id,
            reason: reason || null,
          },
        });

        console.log(`Order ${orderId} status updated from ${oldStatus} to ${newStatus} by admin ${user.id}`);
        result = { success: true, message: `Order status updated to ${newStatus}` };
        break;
      }

      case "add_note": {
        if (!note) {
          return new Response(
            JSON.stringify({ error: "Note content is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create order event for admin note
        await supabase.from("order_events").insert({
          order_id: orderId,
          event_type: "admin_note",
          title: "Admin Note Added",
          description: note,
          metadata: {
            admin_id: user.id,
          },
        });

        console.log(`Admin note added to order ${orderId} by admin ${user.id}`);
        result = { success: true, message: "Note added successfully" };
        break;
      }

      case "cancel": {
        if (!reason) {
          return new Response(
            JSON.stringify({ error: "Cancellation reason is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const oldStatus = order.status;

        // Update order status to cancelled
        const { error: updateError } = await supabase
          .from("orders")
          .update({ 
            status: "cancelled",
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId);

        if (updateError) throw updateError;

        // Create order event
        await supabase.from("order_events").insert({
          order_id: orderId,
          event_type: "admin_cancellation",
          title: "Order Cancelled by Admin",
          description: reason,
          metadata: {
            old_status: oldStatus,
            admin_id: user.id,
            reason: reason,
          },
        });

        console.log(`Order ${orderId} cancelled by admin ${user.id}. Reason: ${reason}`);
        result = { success: true, message: "Order cancelled successfully" };
        break;
      }

      case "flag": {
        // Create order event for flagging
        await supabase.from("order_events").insert({
          order_id: orderId,
          event_type: "admin_flag",
          title: "Order Flagged for Review",
          description: reason || "This order has been flagged for review by an administrator.",
          metadata: {
            admin_id: user.id,
            reason: reason || null,
          },
        });

        console.log(`Order ${orderId} flagged by admin ${user.id}`);
        result = { success: true, message: "Order flagged for review" };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Admin order action error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
