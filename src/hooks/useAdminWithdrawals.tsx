import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface WithdrawalRequest {
  id: string;
  merchant_id: string;
  bank_account_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  transaction_id: string | null;
  failure_reason: string | null;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  merchant?: {
    business_name: string;
    email: string;
    status: string;
  };
  bank_account?: {
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    ifsc_code: string;
  };
  escrow_balance?: number;
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
}

export function useAdminWithdrawals(filters: WithdrawalFilters = {}) {
  const queryClient = useQueryClient();

  const { data: withdrawals, isLoading, refetch } = useQuery({
    queryKey: ["admin-withdrawals", filters],
    queryFn: async () => {
      let query = supabase
        .from("merchant_payouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.minAmount !== undefined) {
        query = query.gte("amount", filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        query = query.lte("amount", filters.maxAmount);
      }
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const { data: payouts, error } = await query;
      if (error) throw error;

      // Enrich with merchant and bank data
      const enrichedPayouts = await Promise.all(
        (payouts || []).map(async (payout) => {
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

          return {
            ...payout,
            merchant: merchant || undefined,
            bank_account: bankAccount || undefined,
            escrow_balance: escrowAccount?.available_balance || 0,
          };
        })
      );

      // Apply search filter client-side
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return enrichedPayouts.filter(
          (w) =>
            w.merchant?.business_name?.toLowerCase().includes(searchLower) ||
            w.id.toLowerCase().includes(searchLower)
        );
      }

      return enrichedPayouts;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-withdrawal-metrics"],
    queryFn: async () => {
      const { data: payouts } = await supabase
        .from("merchant_payouts")
        .select("amount, status");

      const grouped = (payouts || []).reduce(
        (acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + Number(p.amount);
          acc[`${p.status}_count`] = (acc[`${p.status}_count`] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        totalPending: grouped["pending"] || 0,
        totalApproved: grouped["approved"] || 0,
        totalProcessing: grouped["processing"] || 0,
        totalPaid: grouped["paid"] || grouped["completed"] || 0,
        totalFailed: grouped["failed"] || 0,
        totalRejected: grouped["rejected"] || 0,
        pendingCount: grouped["pending_count"] || 0,
        processingCount: grouped["processing_count"] || 0,
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
