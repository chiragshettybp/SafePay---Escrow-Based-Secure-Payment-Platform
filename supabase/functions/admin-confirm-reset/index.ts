import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash function for PIN (must match admin-login)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Password validation
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }
  return { valid: true };
}

// PIN validation
function validatePin(pin: string): { valid: boolean; error?: string } {
  if (pin.length !== 6) {
    return { valid: false, error: "PIN must be exactly 6 digits" };
  }
  if (!/^\d{6}$/.test(pin)) {
    return { valid: false, error: "PIN must contain only numbers" };
  }
  return { valid: true };
}

serve(async (req) => {
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

    const { token, password, confirmPassword, pin, confirmPin } = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Validate all fields are present
    if (!token || !password || !confirmPassword || !pin || !confirmPin) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({ error: "Passwords do not match" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate PIN confirmation
    if (pin !== confirmPin) {
      return new Response(
        JSON.stringify({ error: "PINs do not match" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate PIN format
    const pinValidation = validatePin(pin);
    if (!pinValidation.valid) {
      return new Response(
        JSON.stringify({ error: pinValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find and validate reset token
    const { data: resetRecord, error: tokenError } = await supabaseAdmin
      .from("admin_password_resets")
      .select("id, admin_id, expires_at, used")
      .eq("reset_token", token)
      .single();

    if (tokenError || !resetRecord) {
      console.log("Invalid reset token:", token);
      // Log failed attempt
      await supabaseAdmin.from("admin_login_attempts").insert({
        email: "unknown",
        success: false,
        failure_reason: "Invalid password reset token",
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      
      return new Response(
        JSON.stringify({ error: "Invalid or expired reset token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is already used
    if (resetRecord.used) {
      return new Response(
        JSON.stringify({ error: "This reset link has already been used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This reset link has expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin user
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("id, user_id, email")
      .eq("id", resetRecord.admin_id)
      .single();

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Admin account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the new PIN
    const pinHash = await hashPin(pin);

    // Update password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.user_id,
      { password: password }
    );

    if (authError) {
      console.error("Error updating auth password:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to update password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update PIN hash in admin_users table
    const { error: updateError } = await supabaseAdmin
      .from("admin_users")
      .update({
        pin_hash: pinHash,
        updated_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", adminUser.id);

    if (updateError) {
      console.error("Error updating admin PIN:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update PIN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used
    await supabaseAdmin
      .from("admin_password_resets")
      .update({ used: true })
      .eq("id", resetRecord.id);

    // Invalidate all existing sessions for this user
    await supabaseAdmin.auth.admin.signOut(adminUser.user_id, "global");

    // Log successful reset
    await supabaseAdmin.from("admin_login_attempts").insert({
      email: adminUser.email,
      success: true,
      failure_reason: null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    console.log("Admin password and PIN reset successfully for:", adminUser.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password and PIN updated successfully. Please log in with your new credentials." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Password reset confirmation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
