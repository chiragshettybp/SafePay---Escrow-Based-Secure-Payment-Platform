import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify they're an admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role using service client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      console.error(`Non-admin user ${user.id} attempted user action`);
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, action, reason, notes, durationDays } = await req.json();

    if (!userId || !action || !reason) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["warn", "suspend", "ban"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Admin ${user.id} executing ${action} on user ${userId}`);

    // Determine new account status
    let newStatus = "active";
    if (action === "warn") {
      newStatus = "warned";
    } else if (action === "suspend") {
      newStatus = "suspended";
    } else if (action === "ban") {
      newStatus = "banned";
    }

    // Update user profile status
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: newStatus })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      throw profileError;
    }

    // For warnings, insert into user_warnings
    if (action === "warn") {
      const { error: warningError } = await supabaseAdmin
        .from("user_warnings")
        .insert({
          user_id: userId,
          admin_id: user.id,
          reason,
          notes,
        });

      if (warningError) {
        console.error("Error creating warning:", warningError);
        throw warningError;
      }
    }

    // For suspend/ban, insert into user_bans
    if (action === "suspend" || action === "ban") {
      const expiresAt = action === "suspend" && durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: banError } = await supabaseAdmin
        .from("user_bans")
        .insert({
          user_id: userId,
          admin_id: user.id,
          action_type: action,
          reason,
          notes,
          duration_days: action === "suspend" ? durationDays : null,
          expires_at: expiresAt,
          is_active: true,
        });

      if (banError) {
        console.error("Error creating ban record:", banError);
        throw banError;
      }
    }

    console.log(`User ${userId} ${action} completed by admin ${user.id}: ${reason}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("User action error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
