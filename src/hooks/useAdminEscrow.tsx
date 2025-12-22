import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface EscrowAccount {
  id: string;
  merchant_id: string;
  total_balance: number;
  locked_balance: number;
  available_balance: number;
  is_frozen: boolean;
  risk_flag: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  merchant?: {
    business_name: string;
    email: string;
    status: string;
  };
  orders_count?: number;
}

export interface EscrowTransaction {
  id: string;
  escrow_account_id: string;
  order_id: string | null;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  order?: {
    product_name: string;
    status: string;
  };
}

export interface EscrowFilters {
  search?: string;
  riskFlag?: string;
  isFrozen?: boolean;
  minBalance?: number;
  maxBalance?: number;
}

export interface EscrowMetrics {
  totalEscrowBalance: number;
  totalLockedFunds: number;
  totalReleasableFunds: number;
  pendingWithdrawals: number;
  failedPayouts: number;
  accountsCount: number;
  frozenAccounts: number;
}

export function useAdminEscrow(filters: EscrowFilters = {}) {
  const queryClient = useQueryClient();

  const { data: escrowAccounts, isLoading, refetch } = useQuery({
    queryKey: ["admin-escrow-accounts", filters],
    queryFn: async () => {
      // Fetch escrow accounts
      let query = supabase
        .from("escrow_accounts")
        .select("*")
        .order("total_balance", { ascending: false });

      if (filters.isFrozen !== undefined) {
        query = query.eq("is_frozen", filters.isFrozen);
      }
      if (filters.riskFlag) {
        query = query.eq("risk_flag", filters.riskFlag);
      }
      if (filters.minBalance !== undefined) {
        query = query.gte("total_balance", filters.minBalance);
      }
      if (filters.maxBalance !== undefined) {
        query = query.lte("total_balance", filters.maxBalance);
      }

      const { data: accounts, error } = await query;
      if (error) throw error;

      // Enrich with merchant data
      const enrichedAccounts = await Promise.all(
        (accounts || []).map(async (account) => {
          const { data: merchant } = await supabase
            .from("merchants")
            .select("business_name, email, status")
            .eq("user_id", account.merchant_id)
            .single();

          const { count } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("merchant_id", account.merchant_id)
            .in("status", ["escrow_locked", "in_progress", "delivered"]);

          return {
            ...account,
            merchant: merchant || undefined,
            orders_count: count || 0,
          };
        })
      );

      // Apply search filter client-side
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return enrichedAccounts.filter(
          (acc) =>
            acc.merchant?.business_name?.toLowerCase().includes(searchLower) ||
            acc.id.toLowerCase().includes(searchLower)
        );
      }

      return enrichedAccounts;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-escrow-metrics"],
    queryFn: async () => {
      const { data: accounts } = await supabase
        .from("escrow_accounts")
        .select("total_balance, locked_balance, available_balance, is_frozen");

      const { data: pendingWithdrawals } = await supabase
        .from("merchant_payouts")
        .select("amount")
        .in("status", ["pending", "processing"]);

      const { data: failedPayouts } = await supabase
        .from("merchant_payouts")
        .select("amount")
        .eq("status", "failed");

      const totalEscrowBalance = (accounts || []).reduce((sum, acc) => sum + Number(acc.total_balance), 0);
      const totalLockedFunds = (accounts || []).reduce((sum, acc) => sum + Number(acc.locked_balance), 0);
      const totalReleasableFunds = (accounts || []).reduce((sum, acc) => sum + Number(acc.available_balance), 0);
      const frozenAccounts = (accounts || []).filter((acc) => acc.is_frozen).length;

      return {
        totalEscrowBalance,
        totalLockedFunds,
        totalReleasableFunds,
        pendingWithdrawals: (pendingWithdrawals || []).reduce((sum, p) => sum + Number(p.amount), 0),
        failedPayouts: (failedPayouts || []).reduce((sum, p) => sum + Number(p.amount), 0),
        accountsCount: (accounts || []).length,
        frozenAccounts,
      } as EscrowMetrics;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-escrow-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escrow_accounts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-escrow-accounts"] });
          queryClient.invalidateQueries({ queryKey: ["admin-escrow-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    escrowAccounts: escrowAccounts || [],
    metrics,
    isLoading,
    refetch,
  };
}

export function useAdminEscrowDetails(escrowId: string) {
  const queryClient = useQueryClient();

  const { data: escrowAccount, isLoading } = useQuery({
    queryKey: ["admin-escrow-account", escrowId],
    queryFn: async () => {
      const { data: account, error } = await supabase
        .from("escrow_accounts")
        .select("*")
        .eq("id", escrowId)
        .single();

      if (error) throw error;

      const { data: merchant } = await supabase
        .from("merchants")
        .select("*")
        .eq("user_id", account.merchant_id)
        .single();

      const { data: kyc } = await supabase
        .from("merchant_kyc")
        .select("status")
        .eq("merchant_id", account.merchant_id)
        .single();

      return {
        ...account,
        merchant,
        kyc_status: kyc?.status || "not_started",
      };
    },
    enabled: !!escrowId,
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-escrow-orders", escrowId],
    queryFn: async () => {
      if (!escrowAccount?.merchant_id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("*, disputes(*)")
        .eq("merchant_id", escrowAccount.merchant_id)
        .in("status", ["escrow_locked", "in_progress", "delivered", "disputed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!escrowAccount?.merchant_id,
  });

  const { data: transactions } = useQuery({
    queryKey: ["admin-escrow-transactions", escrowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escrow_transactions")
        .select("*, orders(product_name, status)")
        .eq("escrow_account_id", escrowId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((t) => ({
        ...t,
        order: t.orders,
      }));
    },
    enabled: !!escrowId,
  });

  const { data: actionsLog } = useQuery({
    queryKey: ["admin-escrow-actions", escrowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_financial_actions_log")
        .select("*")
        .eq("target_type", "escrow_account")
        .eq("target_id", escrowId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!escrowId,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`admin-escrow-${escrowId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escrow_accounts", filter: `id=eq.${escrowId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-escrow-account", escrowId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escrow_transactions", filter: `escrow_account_id=eq.${escrowId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-escrow-transactions", escrowId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [escrowId, queryClient]);

  return {
    escrowAccount,
    orders: orders || [],
    transactions: transactions || [],
    actionsLog: actionsLog || [],
    isLoading,
  };
}

export function useEscrowActions() {
  const queryClient = useQueryClient();

  const escrowAction = useMutation({
    mutationFn: async ({
      escrowId,
      action,
      amount,
      reason,
    }: {
      escrowId: string;
      action: "lock" | "unlock" | "adjust" | "freeze" | "unfreeze";
      amount?: number;
      reason: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-escrow-action", {
        body: { escrowId, action, amount, reason },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Escrow ${variables.action} action completed successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-escrow-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-escrow-account", variables.escrowId] });
      queryClient.invalidateQueries({ queryKey: ["admin-escrow-transactions", variables.escrowId] });
      queryClient.invalidateQueries({ queryKey: ["admin-escrow-metrics"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to perform escrow action");
    },
  });

  return { escrowAction };
}
