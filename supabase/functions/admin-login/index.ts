import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for PIN verification
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password, pin, userAgent } = await req.json();
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Validate inputs
    if (!email || !password || !pin) {
      return new Response(JSON.stringify({ error: "Email, password, and PIN are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "PIN must be 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check admin account
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users").select("*").eq("email", trimmedEmail).single();

    if (adminError || !adminUser) {
      await supabaseAdmin.from("admin_login_attempts").insert({ email: trimmedEmail, ip_address: clientIP, user_agent: userAgent, success: false, failure_reason: "Admin not found" });
      return new Response(JSON.stringify({ error: "Invalid admin credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if locked
    if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
      const lockRemaining = Math.ceil((new Date(adminUser.locked_until).getTime() - Date.now()) / 60000);
      return new Response(JSON.stringify({ error: `Account locked. Try again in ${lockRemaining} minutes.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!adminUser.is_active) {
      return new Response(JSON.stringify({ error: "Admin account is disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify PIN
    const pinHash = await hashPin(pin);
    if (pinHash !== adminUser.pin_hash) {
      const failedAttempts = (adminUser.failed_login_attempts || 0) + 1;
      const updateData: Record<string, unknown> = { failed_login_attempts: failedAttempts };
      if (failedAttempts >= 5) updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabaseAdmin.from("admin_users").update(updateData).eq("id", adminUser.id);
      await supabaseAdmin.from("admin_login_attempts").insert({ email: trimmedEmail, ip_address: clientIP, user_agent: userAgent, success: false, failure_reason: "Invalid PIN" });
      return new Response(JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Authenticate
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({ email: trimmedEmail, password });
    if (authError || !authData.session) {
      const failedAttempts = (adminUser.failed_login_attempts || 0) + 1;
      const updateData: Record<string, unknown> = { failed_login_attempts: failedAttempts };
      if (failedAttempts >= 5) updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabaseAdmin.from("admin_users").update(updateData).eq("id", adminUser.id);
      await supabaseAdmin.from("admin_login_attempts").insert({ email: trimmedEmail, ip_address: clientIP, user_agent: userAgent, success: false, failure_reason: "Invalid password" });
      return new Response(JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify admin role (CRITICAL: Server-side validation)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", authData.user.id).eq("role", "admin").single();

    if (roleError || !roleData) {
      await supabaseAdmin.auth.admin.signOut(authData.session.access_token);
      await supabaseAdmin.from("admin_login_attempts").insert({ email: trimmedEmail, ip_address: clientIP, user_agent: userAgent, success: false, failure_reason: "Not an admin" });
      return new Response(JSON.stringify({ error: "Unauthorized access" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Success - reset failed attempts
    await supabaseAdmin.from("admin_users").update({ last_login_at: new Date().toISOString(), failed_login_attempts: 0, locked_until: null }).eq("id", adminUser.id);
    await supabaseAdmin.from("admin_login_attempts").insert({ email: trimmedEmail, ip_address: clientIP, user_agent: userAgent, success: true, failure_reason: null });

    return new Response(JSON.stringify({ success: true, session: authData.session, user: { id: authData.user.id, email: authData.user.email, role: "admin" } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Admin login error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
