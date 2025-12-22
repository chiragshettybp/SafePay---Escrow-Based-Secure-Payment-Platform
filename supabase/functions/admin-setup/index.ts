import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for PIN (matches admin-login)
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
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { setupKey } = await req.json();
    
    // Verify setup key - use a simple setup key for initial setup
    const validSetupKey = "admin-init-2024";
    if (setupKey !== validSetupKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmail = "ichiragshetty@gmail.com";
    const adminPassword = "Sample@#0000";
    const adminPin = "009988";

    // Check if admin user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

    let userId: string;

    if (existingAdmin) {
      userId = existingAdmin.id;
      console.log("Admin auth user already exists:", userId);
    } else {
      // Create admin user in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error("Error creating admin user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create admin user", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("Created admin auth user:", userId);
    }

    // Check if admin role exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!existingRole) {
      // Add admin role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
        });

      if (roleError) {
        console.error("Error adding admin role:", roleError);
      } else {
        console.log("Added admin role for user:", userId);
      }
    }

    // Check if admin_users record exists
    const { data: existingAdminRecord } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .single();

    const pinHash = await hashPin(adminPin);

    if (!existingAdminRecord) {
      // Create admin_users record
      const { error: adminRecordError } = await supabaseAdmin
        .from("admin_users")
        .insert({
          user_id: userId,
          email: adminEmail,
          pin_hash: pinHash,
          role: "super_admin",
          is_active: true,
        });

      if (adminRecordError) {
        console.error("Error creating admin record:", adminRecordError);
        return new Response(
          JSON.stringify({ error: "Failed to create admin record", details: adminRecordError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Created admin_users record for:", adminEmail);
    } else {
      // Update PIN hash in case it changed
      await supabaseAdmin
        .from("admin_users")
        .update({ pin_hash: pinHash })
        .eq("user_id", userId);
      console.log("Updated admin_users record for:", adminEmail);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin account setup complete",
        userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin setup error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
