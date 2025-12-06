import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";

export interface Wallet {
  id: string;
  customer_id: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  customer_id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  reference_id: string | null;
  reference_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  customer_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_type: string;
  is_default: boolean;
  is_verified: boolean;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccountFormData {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_type: string;
  is_default: boolean;
}

export function useWallet() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Fetch or create wallet
  const { data: wallet, isLoading: isLoadingWallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Try to fetch existing wallet
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("customer_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no wallet exists, create one
      if (!data) {
        const { data: newWallet, error: createError } = await supabase
          .from("wallets")
          .insert({ customer_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        return newWallet as Wallet;
      }

      return data as Wallet;
    },
    enabled: !!user?.id,
  });

  // Fetch wallet transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!user?.id,
  });

  // Fetch bank accounts
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery({
    queryKey: ["bank-accounts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!user?.id,
  });

  // Add bank account mutation
  const addBankAccount = useMutation({
    mutationFn: async (formData: BankAccountFormData) => {
      if (!user?.id) throw new Error("User not authenticated");

      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from("bank_accounts")
          .update({ is_default: false })
          .eq("customer_id", user.id);
      }

      const { data, error } = await supabase
        .from("bank_accounts")
        .insert({
          ...formData,
          customer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({
        title: "Bank Account Added",
        description: "Your bank account has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bank account mutation
  const updateBankAccount = useMutation({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: string;
      formData: Partial<BankAccountFormData>;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from("bank_accounts")
          .update({ is_default: false })
          .eq("customer_id", user.id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("bank_accounts")
        .update(formData)
        .eq("id", id)
        .eq("customer_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({
        title: "Bank Account Updated",
        description: "Your bank account has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete bank account mutation
  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id)
        .eq("customer_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({
        title: "Bank Account Deleted",
        description: "Your bank account has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const walletChannel = supabase
      .channel("wallet-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_transactions",
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bank_accounts",
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
    };
  }, [user?.id, queryClient]);

  // Calculate metrics
  const metrics = {
    totalRefundsReceived:
      transactions
        ?.filter((t) => t.type === "refund" && t.status === "success")
        .reduce((sum, t) => sum + t.amount, 0) || 0,
    totalWithdrawn:
      transactions
        ?.filter((t) => t.type === "withdrawal" && t.status === "success")
        .reduce((sum, t) => sum + t.amount, 0) || 0,
    pendingRefunds:
      transactions
        ?.filter((t) => t.type === "refund" && t.status === "pending")
        .reduce((sum, t) => sum + t.amount, 0) || 0,
  };

  return {
    wallet,
    transactions,
    bankAccounts,
    metrics,
    isLoadingWallet,
    isLoadingTransactions,
    isLoadingBankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
  };
}
