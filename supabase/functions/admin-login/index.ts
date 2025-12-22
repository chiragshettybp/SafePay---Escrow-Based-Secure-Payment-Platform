import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for PIN verification (in production, use bcrypt)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, pin, userAgent } = await req.json();
    
    // Get client IP from headers
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Validate required fields
    if (!email || !password || !pin) {
      await logAttempt(supabaseAdmin, email || "unknown", clientIP, userAgent, false, "Missing credentials");
      return new Response(
        JSON.stringify({ error: "Email, password, and PIN are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if admin account exists and is not locked
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (adminError || !adminUser) {
      await logAttempt(supabaseAdmin, email, clientIP, userAgent, false, "Admin not found");
      return new Response(
        JSON.stringify({ error: "Invalid admin credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if account is locked
    if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
      await logAttempt(supabaseAdmin, email, clientIP, userAgent, false, "Account locked");
      const lockRemaining = Math.ceil((new Date(adminUser.locked_until).getTime() - Date.now()) / 60000);
      return new Response(
        JSON.stringify({ error: `Account locked. Try again in ${lockRemaining} minutes.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if account is active
    if (!adminUser.is_active) {
      await logAttempt(supabaseAdmin, email, clientIP, userAgent, false, "Account disabled");
      return new Response(
        JSON.stringify({ error: "Admin account is disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify PIN first
    const pinHash = await hashPin(pin);
    if (pinHash !== adminUser.pin_hash) {
      await handleFailedAttempt(supabaseAdmin, adminUser, email, clientIP, userAgent, "Invalid PIN");
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      await handleFailedAttempt(supabaseAdmin, adminUser, email, clientIP, userAgent, "Invalid password");
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      // Sign out the user since they don't have admin role
      await supabaseAdmin.auth.admin.signOut(authData.session.access_token);
      await logAttempt(supabaseAdmin, email, clientIP, userAgent, false, "Not an admin");
      return new Response(
        JSON.stringify({ error: "Unauthorized access" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success! Reset failed attempts and update last login
    await supabaseAdmin
      .from("admin_users")
      .update({
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", adminUser.id);

    await logAttempt(supabaseAdmin, email, clientIP, userAgent, true, null);

    return new Response(
      JSON.stringify({
        success: true,
        session: authData.session,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: "admin",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleFailedAttempt(
  supabase: any,
  adminUser: any,
  email: string,
  ip: string,
  userAgent: string,
  reason: string
) {
  const failedAttempts = (adminUser.failed_login_attempts || 0) + 1;
  const maxAttempts = 5;
  const lockDurationMinutes = 15;

  const updateData: any = {
    failed_login_attempts: failedAttempts,
  };

  // Lock account after max attempts
  if (failedAttempts >= maxAttempts) {
    updateData.locked_until = new Date(Date.now() + lockDurationMinutes * 60 * 1000).toISOString();
  }

  await supabase
    .from("admin_users")
    .update(updateData)
    .eq("id", adminUser.id);

  await logAttempt(supabase, email, ip, userAgent, false, reason);
}

async function logAttempt(
  supabase: any,
  email: string,
  ip: string,
  userAgent: string,
  success: boolean,
  failureReason: string | null
) {
  await supabase.from("admin_login_attempts").insert({
    email,
    ip_address: ip,
    user_agent: userAgent,
    success,
    failure_reason: failureReason,
  });
}
