import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KillSwitchRequest {
  action: 'activate' | 'deactivate' | 'get_status';
  level?: 1 | 2 | 3 | 4;
  reason?: string;
  incident_id?: string;
  resolution_notes?: string;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify admin authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return json(401, { error: "Invalid token" });
  }

  // Verify admin role
  const { data: adminCheck } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!adminCheck) {
    return json(403, { error: "Admin access required" });
  }

  try {
    const body: KillSwitchRequest = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip");
    const userAgent = req.headers.get("user-agent");

    console.log(`[KillSwitch] Action: ${body.action} by admin: ${user.id}`);

    switch (body.action) {
      case 'get_status': {
        // Get current platform status
        const { data: flags } = await supabase
          .from("platform_flags")
          .select("*");

        const { data: activeIncident } = await supabase
          .from("platform_incidents")
          .select("*")
          .eq("status", "active")
          .order("activated_at", { ascending: false })
          .limit(1)
          .single();

        const { data: recentIncidents } = await supabase
          .from("platform_incidents")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        return json(200, {
          flags: flags || [],
          activeIncident,
          recentIncidents: recentIncidents || [],
        });
      }

      case 'activate': {
        if (!body.level || body.level < 1 || body.level > 4) {
          return json(400, { error: "Invalid kill-switch level (1-4 required)" });
        }

        if (!body.reason || body.reason.trim().length < 10) {
          return json(400, { error: "Reason must be at least 10 characters" });
        }

        // Check for existing active incident
        const { data: existingIncident } = await supabase
          .from("platform_incidents")
          .select("id, level")
          .eq("status", "active")
          .single();

        if (existingIncident) {
          return json(409, { 
            error: `Active incident already exists at level ${existingIncident.level}. Deactivate first or escalate.`,
            existing_incident_id: existingIncident.id
          });
        }

        // Super admin required for Level 3 & 4
        if (body.level >= 3 && adminCheck.role !== 'super_admin') {
          return json(403, { error: "Level 3 and 4 require super_admin role" });
        }

        // Create incident
        const { data: incident, error: incidentError } = await supabase
          .from("platform_incidents")
          .insert({
            level: body.level,
            status: "active",
            reason: body.reason.trim(),
            activated_by: user.id,
            metadata: { ip_address: ipAddress, user_agent: userAgent }
          })
          .select()
          .single();

        if (incidentError) {
          console.error("[KillSwitch] Failed to create incident:", incidentError);
          return json(500, { error: "Failed to create incident" });
        }

        // Update platform flags based on level
        const flagUpdates: Record<string, boolean | number | string> = {
          active_incident_level: body.level,
          active_incident_id: incident.id,
        };

        if (body.level >= 1) {
          flagUpdates.degradation_warning = true;
        }
        if (body.level >= 2) {
          flagUpdates.checkout_locked = true;
        }
        if (body.level >= 3) {
          flagUpdates.gateway_shutdown = true;
        }
        if (body.level >= 4) {
          flagUpdates.payment_links_disabled = true;
        }

        // Update each flag
        for (const [key, value] of Object.entries(flagUpdates)) {
          await supabase
            .from("platform_flags")
            .update({ 
              value: JSON.stringify(value), 
              updated_at: new Date().toISOString(),
              updated_by: user.id 
            })
            .eq("key", key);
        }

        // Log audit
        await supabase.from("killswitch_audit_log").insert({
          action_type: "activate",
          incident_id: incident.id,
          previous_level: 0,
          new_level: body.level,
          reason: body.reason.trim(),
          admin_id: user.id,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        console.log(`[KillSwitch] Activated Level ${body.level} - Incident: ${incident.id}`);

        return json(200, {
          message: `Kill-switch Level ${body.level} activated`,
          incident,
          flags_updated: Object.keys(flagUpdates),
        });
      }

      case 'deactivate': {
        if (!body.incident_id) {
          return json(400, { error: "incident_id required" });
        }

        if (!body.resolution_notes || body.resolution_notes.trim().length < 10) {
          return json(400, { error: "Resolution notes must be at least 10 characters" });
        }

        // Get the incident
        const { data: incident, error: incidentError } = await supabase
          .from("platform_incidents")
          .select("*")
          .eq("id", body.incident_id)
          .eq("status", "active")
          .single();

        if (incidentError || !incident) {
          return json(404, { error: "Active incident not found" });
        }

        // Calculate impact summary
        const incidentStart = new Date(incident.activated_at);
        const { count: blockedSessions } = await supabase
          .from("checkout_sessions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", incidentStart.toISOString())
          .in("status", ["expired", "abandoned"]);

        const { count: failedPayments } = await supabase
          .from("checkout_attempts")
          .select("*", { count: "exact", head: true })
          .gte("initiated_at", incidentStart.toISOString())
          .eq("status", "failed");

        const impactSummary = {
          duration_minutes: Math.round((Date.now() - incidentStart.getTime()) / 60000),
          sessions_blocked: blockedSessions || 0,
          payments_failed: failedPayments || 0,
        };

        // Update incident to resolved
        await supabase
          .from("platform_incidents")
          .update({
            status: "resolved",
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            resolution_notes: body.resolution_notes.trim(),
            impact_summary: impactSummary,
          })
          .eq("id", body.incident_id);

        // Reset all platform flags
        const resetFlags = [
          "checkout_locked",
          "payment_links_disabled",
          "gateway_shutdown",
          "degradation_warning",
        ];

        for (const key of resetFlags) {
          await supabase
            .from("platform_flags")
            .update({ 
              value: JSON.stringify(false), 
              updated_at: new Date().toISOString(),
              updated_by: user.id 
            })
            .eq("key", key);
        }

        // Reset level and incident ID
        await supabase
          .from("platform_flags")
          .update({ 
            value: JSON.stringify(0), 
            updated_at: new Date().toISOString(),
            updated_by: user.id 
          })
          .eq("key", "active_incident_level");

        await supabase
          .from("platform_flags")
          .update({ 
            value: JSON.stringify(null), 
            updated_at: new Date().toISOString(),
            updated_by: user.id 
          })
          .eq("key", "active_incident_id");

        // Log audit
        await supabase.from("killswitch_audit_log").insert({
          action_type: "deactivate",
          incident_id: body.incident_id,
          previous_level: incident.level,
          new_level: 0,
          reason: body.resolution_notes.trim(),
          admin_id: user.id,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        console.log(`[KillSwitch] Deactivated - Incident: ${body.incident_id}`);

        return json(200, {
          message: "Kill-switch deactivated, system restored",
          impact_summary: impactSummary,
        });
      }

      default:
        return json(400, { error: "Invalid action" });
    }
  } catch (err) {
    console.error("[KillSwitch] Error:", err);
    return json(500, { error: "Internal server error" });
  }
});
