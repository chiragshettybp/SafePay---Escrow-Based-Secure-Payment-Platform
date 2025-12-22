import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { escrowId, withdrawalId, action, amount, reason } = body;

    console.log("Admin escrow action:", { escrowId, withdrawalId, action, amount, reason, adminId: userData.user.id });

    // Get IP address for logging
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    // Handle escrow actions
    if (escrowId) {
      const { data: escrowAccount, error: escrowError } = await supabase
        .from("escrow_accounts")
        .select("*")
        .eq("id", escrowId)
        .single();

      if (escrowError || !escrowAccount) {
        return new Response(JSON.stringify({ error: "Escrow account not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updateData: Record<string, unknown> = {};
      let transactionType = "";
      let transactionAmount = 0;

      switch (action) {
        case "lock":
          if (!amount || amount <= 0) {
            return new Response(JSON.stringify({ error: "Amount is required for lock action" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (amount > escrowAccount.available_balance) {
            return new Response(JSON.stringify({ error: "Insufficient available balance" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          updateData = {
            locked_balance: escrowAccount.locked_balance + amount,
            available_balance: escrowAccount.available_balance - amount,
          };
          transactionType = "lock";
          transactionAmount = amount;
          break;

        case "unlock":
          if (!amount || amount <= 0) {
            return new Response(JSON.stringify({ error: "Amount is required for unlock action" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (amount > escrowAccount.locked_balance) {
            return new Response(JSON.stringify({ error: "Insufficient locked balance" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          updateData = {
            locked_balance: escrowAccount.locked_balance - amount,
            available_balance: escrowAccount.available_balance + amount,
          };
          transactionType = "unlock";
          transactionAmount = amount;
          break;

        case "adjust":
          if (amount === undefined) {
            return new Response(JSON.stringify({ error: "Amount is required for adjust action" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const newBalance = escrowAccount.total_balance + amount;
          const newAvailable = escrowAccount.available_balance + amount;
          if (newBalance < 0 || newAvailable < 0) {
            return new Response(JSON.stringify({ error: "Adjustment would result in negative balance" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          updateData = {
            total_balance: newBalance,
            available_balance: newAvailable,
          };
          transactionType = "adjustment";
          transactionAmount = amount;
          break;

        case "freeze":
          updateData = { is_frozen: true };
          transactionType = "freeze";
          break;

        case "unfreeze":
          updateData = { is_frozen: false };
          transactionType = "unfreeze";
          break;

        default:
          return new Response(JSON.stringify({ error: "Invalid escrow action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      // Update escrow account
      const { error: updateError } = await supabase
        .from("escrow_accounts")
        .update(updateData)
        .eq("id", escrowId);

      if (updateError) {
        console.error("Failed to update escrow account:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update escrow account" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create escrow transaction record
      if (transactionType) {
        await supabase.from("escrow_transactions").insert({
          escrow_account_id: escrowId,
          transaction_type: transactionType,
          amount: transactionAmount,
          balance_before: escrowAccount.total_balance,
          balance_after: transactionType === "adjustment" 
            ? escrowAccount.total_balance + transactionAmount 
            : escrowAccount.total_balance,
          reason,
          created_by: userData.user.id,
        });
      }

      // Log admin action
      await supabase.from("admin_financial_actions_log").insert({
        admin_id: userData.user.id,
        action_type: `escrow_${action}`,
        target_type: "escrow_account",
        target_id: escrowId,
        amount: transactionAmount || null,
        reason,
        ip_address: ipAddress,
        metadata: { previous_state: escrowAccount },
      });

      return new Response(JSON.stringify({ success: true, action }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle withdrawal actions
    if (withdrawalId) {
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from("merchant_payouts")
        .select("*")
        .eq("id", withdrawalId)
        .single();

      if (withdrawalError || !withdrawal) {
        return new Response(JSON.stringify({ error: "Withdrawal not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let newStatus = "";
      let message = "";

      switch (action) {
        case "approve":
          if (withdrawal.status !== "pending") {
            return new Response(JSON.stringify({ error: "Only pending withdrawals can be approved" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          newStatus = "approved";
          message = "Withdrawal approved by admin";
          break;

        case "reject":
          if (!["pending", "approved"].includes(withdrawal.status)) {
            return new Response(JSON.stringify({ error: "Withdrawal cannot be rejected in current status" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (!reason) {
            return new Response(JSON.stringify({ error: "Reason is required for rejection" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          newStatus = "rejected";
          message = `Withdrawal rejected: ${reason}`;

          // Return funds to escrow
          const { data: escrowForReject } = await supabase
            .from("escrow_accounts")
            .select("*")
            .eq("merchant_id", withdrawal.merchant_id)
            .single();

          if (escrowForReject) {
            await supabase
              .from("escrow_accounts")
              .update({
                available_balance: escrowForReject.available_balance + withdrawal.amount,
                total_balance: escrowForReject.total_balance + withdrawal.amount,
              })
              .eq("id", escrowForReject.id);
          }
          break;

        case "process":
          if (withdrawal.status !== "approved") {
            return new Response(JSON.stringify({ error: "Only approved withdrawals can be processed" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          newStatus = "processing";
          message = "Payment processing initiated";
          break;

        case "paid":
          if (withdrawal.status !== "processing") {
            return new Response(JSON.stringify({ error: "Only processing withdrawals can be marked as paid" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          newStatus = "paid";
          message = "Payment completed successfully";
          break;

        case "failed":
          if (withdrawal.status !== "processing") {
            return new Response(JSON.stringify({ error: "Only processing withdrawals can be marked as failed" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (!reason) {
            return new Response(JSON.stringify({ error: "Reason is required for failure" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          newStatus = "failed";
          message = `Payment failed: ${reason}`;
          break;

        case "retry":
          if (withdrawal.status !== "failed") {
            return new Response(JSON.stringify({ error: "Only failed withdrawals can be retried" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          newStatus = "processing";
          message = "Payment retry initiated";
          break;

        default:
          return new Response(JSON.stringify({ error: "Invalid withdrawal action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      // Update withdrawal status
      const updatePayload: Record<string, unknown> = { status: newStatus };
      if (action === "paid") {
        updatePayload.processed_at = new Date().toISOString();
      }
      if (action === "failed" || action === "reject") {
        updatePayload.failure_reason = reason;
      }

      const { error: updateError } = await supabase
        .from("merchant_payouts")
        .update(updatePayload)
        .eq("id", withdrawalId);

      if (updateError) {
        console.error("Failed to update withdrawal:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update withdrawal" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create withdrawal transaction record
      await supabase.from("withdrawal_transactions").insert({
        payout_id: withdrawalId,
        status: newStatus,
        message,
        created_by: userData.user.id,
      });

      // Log admin action
      await supabase.from("admin_financial_actions_log").insert({
        admin_id: userData.user.id,
        action_type: `withdrawal_${action}`,
        target_type: "withdrawal_request",
        target_id: withdrawalId,
        amount: withdrawal.amount,
        reason,
        ip_address: ipAddress,
        metadata: { previous_status: withdrawal.status },
      });

      return new Response(JSON.stringify({ success: true, action, newStatus }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Either escrowId or withdrawalId is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin escrow action error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
