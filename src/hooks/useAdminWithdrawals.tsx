import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_type: "merchant" | "customer";
  bank_account_id: string;
  amount: number;
  fee: number;
  gst: number | null;
  withdrawal_fee: number | null;
  platform_fee: number | null;
  net_amount: number;
  status: string;
  transaction_id: string | null;
  failure_reason: string | null;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  merchant?: {
    business_name: string;
    email: string;
    status: string;
  };
  customer?: {
    full_name: string | null;
    email: string;
  };
  bank_account?: {
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    ifsc_code: string;
  };
  escrow_balance?: number;
  wallet_balance?: number;
}

export interface WithdrawalTransaction {
  id: string;
  payout_id: string;
  status: string;
  message: string | null;
  gateway_response: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface WithdrawalFilters {
  search?: string;
  status?: string;
  userType?: "all" | "merchant" | "customer";
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
}

export interface WithdrawalMetrics {
  totalPending: number;
  totalApproved: number;
  totalProcessing: number;
  totalPaid: number;
  totalFailed: number;
  totalRejected: number;
  pendingCount: number;
  processingCount: number;
  merchantTotal: number;
  customerTotal: number;
}

export function useAdminWithdrawals(filters: WithdrawalFilters = {}) {
  const queryClient = useQueryClient();

  const { data: withdrawals, isLoading, refetch } = useQuery({
    queryKey: ["admin-withdrawals", filters],
    queryFn: async () => {
      const allWithdrawals: WithdrawalRequest[] = [];

      // Fetch merchant payouts
      if (!filters.userType || filters.userType === "all" || filters.userType === "merchant") {
        let merchantQuery = supabase
          .from("merchant_payouts")
          .select("*")
          .order("created_at", { ascending: false });

        if (filters.status) {
          merchantQuery = merchantQuery.eq("status", filters.status);
        }
        if (filters.minAmount !== undefined) {
          merchantQuery = merchantQuery.gte("amount", filters.minAmount);
        }
        if (filters.maxAmount !== undefined) {
          merchantQuery = merchantQuery.lte("amount", filters.maxAmount);
        }
        if (filters.startDate) {
          merchantQuery = merchantQuery.gte("created_at", filters.startDate);
        }
        if (filters.endDate) {
          merchantQuery = merchantQuery.lte("created_at", filters.endDate);
        }

        const { data: merchantPayouts, error: merchantError } = await merchantQuery;
        if (merchantError) {
          console.error("Error fetching merchant payouts:", merchantError);
        }

        // Enrich merchant payouts
        for (const payout of merchantPayouts || []) {
          const { data: merchant } = await supabase
            .from("merchants")
            .select("business_name, email, status")
            .eq("user_id", payout.merchant_id)
            .single();

          const { data: bankAccount } = await supabase
            .from("merchant_bank_accounts")
            .select("bank_name, account_number, account_holder_name, ifsc_code")
            .eq("id", payout.bank_account_id)
            .single();

          const { data: escrowAccount } = await supabase
            .from("escrow_accounts")
            .select("available_balance")
            .eq("merchant_id", payout.merchant_id)
            .single();

          allWithdrawals.push({
            id: payout.id,
            user_id: payout.merchant_id,
            user_type: "merchant",
            bank_account_id: payout.bank_account_id,
            amount: payout.amount,
            fee: payout.fee || 0,
            gst: payout.gst || null,
            withdrawal_fee: payout.withdrawal_fee || null,
            platform_fee: payout.platform_fee || null,
            net_amount: payout.net_amount,
            status: payout.status,
            transaction_id: payout.transaction_id,
            failure_reason: payout.failure_reason,
            notes: payout.notes,
            processed_at: payout.processed_at,
            created_at: payout.created_at,
            updated_at: payout.updated_at,
            user_name: merchant?.business_name || "Unknown Merchant",
            user_email: merchant?.email,
            merchant: merchant || undefined,
            bank_account: bankAccount || undefined,
            escrow_balance: escrowAccount?.available_balance || 0,
          });
        }
      }

      // Fetch customer withdrawals from wallet_transactions
      if (!filters.userType || filters.userType === "all" || filters.userType === "customer") {
        let customerQuery = supabase
          .from("wallet_transactions")
          .select("*")
          .eq("type", "withdrawal")
          .order("created_at", { ascending: false });

        if (filters.status) {
          customerQuery = customerQuery.eq("status", filters.status);
        }
        if (filters.minAmount !== undefined) {
          customerQuery = customerQuery.gte("amount", filters.minAmount);
        }
        if (filters.maxAmount !== undefined) {
          customerQuery = customerQuery.lte("amount", filters.maxAmount);
        }
        if (filters.startDate) {
          customerQuery = customerQuery.gte("created_at", filters.startDate);
        }
        if (filters.endDate) {
          customerQuery = customerQuery.lte("created_at", filters.endDate);
        }

        const { data: customerWithdrawals, error: customerError } = await customerQuery;
        if (customerError) {
          console.error("Error fetching customer withdrawals:", customerError);
        }

        // Enrich customer withdrawals
        for (const withdrawal of customerWithdrawals || []) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", withdrawal.customer_id)
            .single();

          // Get email from auth (we'll use a fallback)
          let email = "Unknown";
          
          const { data: bankAccount } = withdrawal.reference_id ? await supabase
            .from("bank_accounts")
            .select("bank_name, account_number, account_holder_name, ifsc_code")
            .eq("id", withdrawal.reference_id)
            .single() : { data: null };

          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("customer_id", withdrawal.customer_id)
            .single();

          allWithdrawals.push({
            id: withdrawal.id,
            user_id: withdrawal.customer_id,
            user_type: "customer",
            bank_account_id: withdrawal.reference_id || "",
            amount: withdrawal.amount,
            fee: 0,
            gst: null,
            withdrawal_fee: null,
            platform_fee: null,
            net_amount: withdrawal.amount,
            status: withdrawal.status,
            transaction_id: null,
            failure_reason: null,
            notes: withdrawal.description,
            processed_at: withdrawal.status === "success" ? withdrawal.updated_at : null,
            created_at: withdrawal.created_at,
            updated_at: withdrawal.updated_at,
            user_name: profile?.full_name || "Customer",
            user_email: email,
            customer: {
              full_name: profile?.full_name || null,
              email: email,
            },
            bank_account: bankAccount || undefined,
            wallet_balance: wallet?.balance || 0,
          });
        }
      }

      // Sort by created_at descending
      allWithdrawals.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply search filter client-side
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return allWithdrawals.filter(
          (w) =>
            w.user_name?.toLowerCase().includes(searchLower) ||
            w.id.toLowerCase().includes(searchLower) ||
            w.user_email?.toLowerCase().includes(searchLower)
        );
      }

      return allWithdrawals;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-withdrawal-metrics"],
    queryFn: async () => {
      // Fetch merchant payouts metrics
      const { data: merchantPayouts } = await supabase
        .from("merchant_payouts")
        .select("amount, status");

      // Fetch customer withdrawals metrics
      const { data: customerWithdrawals } = await supabase
        .from("wallet_transactions")
        .select("amount, status")
        .eq("type", "withdrawal");

      const allRecords = [
        ...(merchantPayouts || []).map(p => ({ ...p, source: "merchant" })),
        ...(customerWithdrawals || []).map(w => ({ ...w, source: "customer" })),
      ];

      const grouped = allRecords.reduce(
        (acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + Number(p.amount);
          acc[`${p.status}_count`] = (acc[`${p.status}_count`] || 0) + 1;
          if (p.source === "merchant") {
            acc["merchant_total"] = (acc["merchant_total"] || 0) + Number(p.amount);
          } else {
            acc["customer_total"] = (acc["customer_total"] || 0) + Number(p.amount);
          }
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        totalPending: grouped["pending"] || 0,
        totalApproved: grouped["approved"] || 0,
        totalProcessing: grouped["processing"] || 0,
        totalPaid: (grouped["paid"] || 0) + (grouped["success"] || 0),
        totalFailed: grouped["failed"] || 0,
        totalRejected: grouped["rejected"] || 0,
        pendingCount: grouped["pending_count"] || 0,
        processingCount: grouped["processing_count"] || 0,
        merchantTotal: grouped["merchant_total"] || 0,
        customerTotal: grouped["customer_total"] || 0,
      } as WithdrawalMetrics;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-withdrawals-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchant_payouts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
          queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-metrics"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
          queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    withdrawals: withdrawals || [],
    metrics,
    isLoading,
    refetch,
  };
}

export function useAdminWithdrawalDetails(withdrawalId: string) {
  const queryClient = useQueryClient();

  const { data: withdrawal, isLoading } = useQuery({
    queryKey: ["admin-withdrawal", withdrawalId],
    queryFn: async () => {
      const { data: payout, error } = await supabase
        .from("merchant_payouts")
        .select("*")
        .eq("id", withdrawalId)
        .single();

      if (error) throw error;

      const { data: merchant } = await supabase
        .from("merchants")
        .select("*")
        .eq("user_id", payout.merchant_id)
        .single();

      const { data: bankAccount } = await supabase
        .from("merchant_bank_accounts")
        .select("*")
        .eq("id", payout.bank_account_id)
        .single();

      const { data: kyc } = await supabase
        .from("merchant_kyc")
        .select("status")
        .eq("merchant_id", payout.merchant_id)
        .single();

      const { data: escrowAccount } = await supabase
        .from("escrow_accounts")
        .select("*")
        .eq("merchant_id", payout.merchant_id)
        .single();

      return {
        ...payout,
        merchant,
        bank_account: bankAccount,
        kyc_status: kyc?.status || "not_started",
        escrow_account: escrowAccount,
      };
    },
    enabled: !!withdrawalId,
  });

  const { data: transactions } = useQuery({
    queryKey: ["admin-withdrawal-transactions", withdrawalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_transactions")
        .select("*")
        .eq("payout_id", withdrawalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!withdrawalId,
  });

  const { data: actionsLog } = useQuery({
    queryKey: ["admin-withdrawal-actions", withdrawalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_financial_actions_log")
        .select("*")
        .eq("target_type", "withdrawal_request")
        .eq("target_id", withdrawalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!withdrawalId,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`admin-withdrawal-${withdrawalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchant_payouts", filter: `id=eq.${withdrawalId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-withdrawal", withdrawalId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_transactions", filter: `payout_id=eq.${withdrawalId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-transactions", withdrawalId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [withdrawalId, queryClient]);

  return {
    withdrawal,
    transactions: transactions || [],
    actionsLog: actionsLog || [],
    isLoading,
  };
}

export function useWithdrawalActions() {
  const queryClient = useQueryClient();

  const withdrawalAction = useMutation({
    mutationFn: async ({
      withdrawalId,
      action,
      reason,
    }: {
      withdrawalId: string;
      action: "approve" | "reject" | "process" | "paid" | "failed" | "retry";
      reason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-escrow-action", {
        body: { withdrawalId, action, reason },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Withdrawal ${variables.action} action completed successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal", variables.withdrawalId] });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-transactions", variables.withdrawalId] });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-escrow-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-escrow-metrics"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to perform withdrawal action");
    },
  });

  return { withdrawalAction };
}
