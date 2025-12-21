/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  email: string;
  password: string;
  businessName: string;
  phone?: string | null;
  category?: string | null;
  gstNumber?: string | null;
  address?: string | null;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Missing server configuration" });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const email = (payload.email || "").trim().toLowerCase();
  const password = payload.password || "";
  const businessName = (payload.businessName || "").trim();

  if (!email || !email.includes("@")) {
    return json(400, { error: "Valid email is required" });
  }

  // Keep validation aligned with the frontend requirements.
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return json(400, {
      error:
        "Password must be at least 8 characters and include uppercase, lowercase, and a number",
    });
  }

  if (businessName.length < 2) {
    return json(400, { error: "Business name must be at least 2 characters" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Create confirmed auth user (bypasses project-level email confirmation)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      is_merchant: true,
    },
  });

  if (createError || !created?.user) {
    const msg = createError?.message || "Failed to create user";
    const status = msg.toLowerCase().includes("already") ? 409 : 400;
    return json(status, { error: msg });
  }

  const userId = created.user.id;

  // 2) Create merchant profile (auto-approved)
  const { error: merchantError } = await admin.from("merchants").insert({
    user_id: userId,
    email,
    business_name: businessName,
    phone: payload.phone ?? null,
    category: payload.category ?? null,
    gst_number: payload.gstNumber ?? null,
    address: payload.address ?? null,
    status: "active",
  });

  if (merchantError) {
    // Best effort cleanup
    await admin.auth.admin.deleteUser(userId);
    return json(400, { error: merchantError.message });
  }

  // 3) Assign merchant role
  const { error: roleError } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "merchant" }, { onConflict: "user_id,role" });

  if (roleError) {
    // Cleanup user + merchant row to avoid dangling accounts
    await admin.from("merchants").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
    return json(400, { error: roleError.message });
  }

  return json(200, { ok: true, user_id: userId });
});
