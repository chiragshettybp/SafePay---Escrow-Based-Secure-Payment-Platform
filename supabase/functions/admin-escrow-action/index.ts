import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid escrow actions
type EscrowAction = "lock" | "unlock" | "adjust" | "freeze" | "unfreeze";

// Finalized states where no further action is allowed
const FINALIZED_STATES = ["released", "refunded", "force_released", "force_refunded"];

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

    // Verify admin role using user_roles table
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

    // Also verify in admin_users table for active status
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, email, is_active")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser) {
      return new Response(JSON.stringify({ error: "Admin account not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { escrowId, withdrawalId, action, amount, reason } = body;

    console.log("Admin escrow action:", { escrowId, withdrawalId, action, amount, reason, adminId: userData.user.id });

    // Get IP address for logging
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const now = new Date().toISOString();

    // Handle escrow actions
    if (escrowId) {
      // Fetch escrow account with version for optimistic locking
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

      // VALIDATION: Check if escrow is finalized (no actions allowed)
      if (escrowAccount.notes && FINALIZED_STATES.some(state => escrowAccount.notes?.toLowerCase().includes(state))) {
        return new Response(JSON.stringify({ 
          error: "Cannot modify finalized escrow account",
          details: "This escrow account has been finalized and no further actions are permitted"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // VALIDATION: Block all actions (except unfreeze) on frozen accounts
      if (escrowAccount.is_frozen && action !== "unfreeze") {
        return new Response(JSON.stringify({ 
          error: "Escrow account is frozen",
          details: "This account must be unfrozen before any other actions can be performed"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // VALIDATION: Reason is mandatory for all actions
      if (!reason || reason.trim().length < 5) {
        return new Response(JSON.stringify({ error: "Reason is required (minimum 5 characters)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get merchant info for notifications
      const { data: merchant } = await supabase
        .from("merchants")
        .select("user_id, business_name, email")
        .eq("user_id", escrowAccount.merchant_id)
        .single();

      let updateData: Record<string, unknown> = { updated_at: now };
      let transactionType = "";
      let transactionAmount = 0;

      switch (action as EscrowAction) {
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
            ...updateData,
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
            ...updateData,
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
            ...updateData,
            total_balance: newBalance,
            available_balance: newAvailable,
          };
          transactionType = "adjustment";
          transactionAmount = amount;
          break;

        case "freeze":
          if (escrowAccount.is_frozen) {
            return new Response(JSON.stringify({ error: "Account is already frozen" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          updateData = { ...updateData, is_frozen: true };
          transactionType = "freeze";
          break;

        case "unfreeze":
          if (!escrowAccount.is_frozen) {
            return new Response(JSON.stringify({ error: "Account is not frozen" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          updateData = { ...updateData, is_frozen: false };
          transactionType = "unfreeze";
          break;

        default:
          return new Response(JSON.stringify({ error: "Invalid escrow action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      // OPTIMISTIC LOCKING: Use updated_at to prevent race conditions
      const { data: updatedAccount, error: updateError } = await supabase
        .from("escrow_accounts")
        .update(updateData)
        .eq("id", escrowId)
        .eq("updated_at", escrowAccount.updated_at) // Version check
        .select()
        .single();

      if (updateError || !updatedAccount) {
        console.error("Failed to update escrow account:", updateError);
        return new Response(JSON.stringify({ 
          error: "Failed to update escrow account - concurrent modification detected",
          details: "Another admin may have modified this account. Please refresh and try again."
        }), {
          status: 409, // Conflict
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

      // Log admin action (immutable audit)
      await supabase.from("admin_financial_actions_log").insert({
        admin_id: userData.user.id,
        action_type: `escrow_${action}`,
        target_type: "escrow_account",
        target_id: escrowId,
        amount: transactionAmount || null,
        reason,
        ip_address: ipAddress,
        metadata: { 
          previous_state: {
            total_balance: escrowAccount.total_balance,
            locked_balance: escrowAccount.locked_balance,
            available_balance: escrowAccount.available_balance,
            is_frozen: escrowAccount.is_frozen
          },
          new_state: {
            total_balance: updatedAccount.total_balance,
            locked_balance: updatedAccount.locked_balance,
            available_balance: updatedAccount.available_balance,
            is_frozen: updatedAccount.is_frozen
          },
          admin_email: adminUser.email,
          merchant_id: escrowAccount.merchant_id
        },
      });

      // MANDATORY NOTIFICATIONS: Notify merchant on freeze/unfreeze
      if (merchant && (action === "freeze" || action === "unfreeze")) {
        await supabase.from("merchant_notifications").insert({
          merchant_id: merchant.user_id,
          title: action === "freeze" ? "Escrow Account Frozen" : "Escrow Account Unfrozen",
          body: action === "freeze" 
            ? `Your escrow account has been frozen by admin. Reason: ${reason}. All withdrawals are blocked until unfrozen. Contact support for assistance.`
            : `Your escrow account has been unfrozen. You can now resume normal operations. Reason: ${reason}`,
          type: "system",
          priority: "high",
        });
      }

      // Notify merchant on lock/unlock/adjust actions
      if (merchant && (action === "lock" || action === "unlock" || action === "adjust")) {
        const formatCurrency = (amt: number) => `₹${Math.abs(amt).toLocaleString("en-IN")}`;
        let notificationTitle = "";
        let notificationBody = "";

        switch (action) {
          case "lock":
            notificationTitle = "Funds Locked";
            notificationBody = `${formatCurrency(amount)} has been locked in your escrow account. Reason: ${reason}`;
            break;
          case "unlock":
            notificationTitle = "Funds Unlocked";
            notificationBody = `${formatCurrency(amount)} has been unlocked in your escrow account. Reason: ${reason}`;
            break;
          case "adjust":
            notificationTitle = amount > 0 ? "Escrow Balance Increased" : "Escrow Balance Decreased";
            notificationBody = `Your escrow balance has been ${amount > 0 ? "increased" : "decreased"} by ${formatCurrency(amount)}. Reason: ${reason}`;
            break;
        }

        await supabase.from("merchant_notifications").insert({
          merchant_id: merchant.user_id,
          title: notificationTitle,
          body: notificationBody,
          type: "payment",
          priority: "normal",
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        action,
        escrowId,
        newState: {
          total_balance: updatedAccount.total_balance,
          locked_balance: updatedAccount.locked_balance,
          available_balance: updatedAccount.available_balance,
          is_frozen: updatedAccount.is_frozen
        }
      }), {
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

      // Check if merchant's escrow is frozen (block all withdrawals)
      const { data: merchantEscrow } = await supabase
        .from("escrow_accounts")
        .select("is_frozen")
        .eq("merchant_id", withdrawal.merchant_id)
        .single();

      if (merchantEscrow?.is_frozen && action === "approve") {
        return new Response(JSON.stringify({ 
          error: "Cannot approve withdrawal - Merchant escrow is frozen",
          details: "The merchant's escrow account must be unfrozen before approving withdrawals"
        }), {
          status: 400,
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

          // Return funds to escrow atomically
          const { data: escrowForReject } = await supabase
            .from("escrow_accounts")
            .select("*")
            .eq("merchant_id", withdrawal.merchant_id)
            .single();

          if (escrowForReject) {
            const { error: escrowUpdateError } = await supabase
              .from("escrow_accounts")
              .update({
                available_balance: escrowForReject.available_balance + withdrawal.amount,
                total_balance: escrowForReject.total_balance + withdrawal.amount,
                updated_at: now
              })
              .eq("id", escrowForReject.id);

            if (escrowUpdateError) {
              console.error("Failed to return funds to escrow:", escrowUpdateError);
              return new Response(JSON.stringify({ 
                error: "Failed to return funds to escrow",
                details: "Withdrawal rejection aborted to prevent fund loss"
              }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            // Record escrow transaction
            await supabase.from("escrow_transactions").insert({
              escrow_account_id: escrowForReject.id,
              transaction_type: "credit",
              amount: withdrawal.amount,
              balance_before: escrowForReject.total_balance,
              balance_after: escrowForReject.total_balance + withdrawal.amount,
              reason: `Withdrawal rejection: ${reason}`,
              created_by: userData.user.id,
            });
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
      const updatePayload: Record<string, unknown> = { status: newStatus, updated_at: now };
      if (action === "paid") {
        updatePayload.processed_at = now;
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
        metadata: { 
          previous_status: withdrawal.status,
          new_status: newStatus,
          admin_email: adminUser.email,
          merchant_id: withdrawal.merchant_id
        },
      });

      // Notify merchant
      await supabase.from("merchant_notifications").insert({
        merchant_id: withdrawal.merchant_id,
        title: `Withdrawal ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        body: message,
        type: "payout",
        priority: action === "paid" ? "high" : "normal",
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
    
    // Log financial failure alert
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const alertSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await alertSupabase.from("admin_alerts").insert({
        alert_type: "financial_failure",
        severity: "high",
        title: "Escrow/Withdrawal Action Failed",
        description: `Admin escrow or withdrawal action failed: ${message}`,
        triggered_by_type: "system",
        metadata: {
          error: message,
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    } catch (alertError) {
      console.error("Failed to create failure alert:", alertError);
    }
    
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});