/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Missing server configuration");
    return json(500, { error: "Missing server configuration" });
  }

  // 1) Authenticate the caller via the Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.log("Missing Authorization header");
    return json(401, { error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");

  // Create client with caller's JWT to verify identity
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: caller },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !caller) {
    console.log("Invalid or expired token", userError?.message);
    return json(401, { error: "Unauthorized" });
  }

  // 2) Check if caller has admin role
  const { data: roleData, error: roleError } = await callerClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error("Error checking admin role:", roleError.message);
    return json(500, { error: "Error checking permissions" });
  }

  if (!roleData) {
    console.log("User is not an admin:", caller.id);
    return json(403, { error: "Forbidden: Admin access required" });
  }

  // 3) Parse request body
  let body: { email?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const targetEmail = (body.email || "").trim().toLowerCase();
  const targetUserId = (body.userId || "").trim();

  if (!targetEmail && !targetUserId) {
    return json(400, { error: "Provide either email or userId" });
  }

  // 4) Use admin client to find and confirm user
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId = targetUserId;

  // If email provided, look up the user
  if (!userId && targetEmail) {
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing users:", listError.message);
      return json(500, { error: "Error finding user" });
    }

    const found = users.users.find((u) => u.email?.toLowerCase() === targetEmail);
    if (!found) {
      return json(404, { error: "User not found" });
    }
    userId = found.id;
  }

  // 5) Confirm the email
  const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
    userId,
    { email_confirm: true }
  );

  if (updateError) {
    console.error("Error confirming email:", updateError.message);
    return json(400, { error: updateError.message });
  }

  console.log("Email confirmed for user:", userId);

  return json(200, {
    ok: true,
    user_id: userId,
    email: updatedUser.user?.email,
    email_confirmed_at: updatedUser.user?.email_confirmed_at,
  });
});
