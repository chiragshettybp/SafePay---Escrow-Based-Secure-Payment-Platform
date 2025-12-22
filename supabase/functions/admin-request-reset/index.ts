import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
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

    const { email } = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Validate email format
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email matches the predefined admin email
    const adminEmail = "ichiragshetty@gmail.com";
    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      console.log(`Unauthorized reset attempt for email: ${email}`);
      // Log the attempt
      await supabaseAdmin.from("admin_login_attempts").insert({
        email: email,
        success: false,
        failure_reason: "Unauthorized password reset attempt",
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      
      // Return generic message to prevent information leakage
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "If this email is associated with an admin account, a reset link will be sent." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check for recent reset requests (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentRequests, error: rateError } = await supabaseAdmin
      .from("admin_password_resets")
      .select("id")
      .eq("ip_address", ipAddress)
      .gte("created_at", oneHourAgo);

    if (rateError) {
      console.error("Error checking rate limit:", rateError);
    }

    if (recentRequests && recentRequests.length >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many reset requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find admin user
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, is_active")
      .eq("email", adminEmail)
      .single();

    if (adminError || !adminUser) {
      console.error("Admin user not found:", adminError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "If this email is associated with an admin account, a reset link will be sent." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adminUser.is_active) {
      return new Response(
        JSON.stringify({ error: "Account is disabled. Contact support." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate any existing unused tokens for this admin
    await supabaseAdmin
      .from("admin_password_resets")
      .update({ used: true })
      .eq("admin_id", adminUser.id)
      .eq("used", false);

    // Generate new reset token with 15 minute expiry
    const resetToken = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("admin_password_resets")
      .insert({
        admin_id: adminUser.id,
        reset_token: resetToken,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error("Error creating reset token:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create reset token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send reset email using Resend (if configured)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = req.headers.get("origin") || "https://lovable.dev";
    const resetUrl = `${appUrl}/admin/reset-password/confirm?token=${resetToken}`;

    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Admin System <onboarding@resend.dev>",
            to: [adminEmail],
            subject: "Admin Password Reset Request",
            html: `
              <h1>Admin Password Reset</h1>
              <p>You have requested to reset your admin password.</p>
              <p>Click the link below to set a new password and PIN:</p>
              <p><a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
              <p>This link will expire in 15 minutes.</p>
              <p>If you did not request this reset, please ignore this email and ensure your account is secure.</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Failed to send email:", await emailResponse.text());
        } else {
          console.log("Reset email sent successfully");
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
      }
    } else {
      // For development: Log the reset URL
      console.log("RESEND_API_KEY not configured. Reset URL:", resetUrl);
      console.log("Reset Token:", resetToken);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "If this email is associated with an admin account, a reset link will be sent.",
        // Only include token in development when RESEND_API_KEY is not set
        ...(resendApiKey ? {} : { devToken: resetToken })
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
