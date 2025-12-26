import { useEffect } from "react";
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

  // Credit wallet from refund - LEDGER-FIRST APPROACH
  // Wallet balance will be auto-synced via database trigger
  const creditFromRefund = useMutation({
    mutationFn: async ({
      refundId,
      amount,
      orderId,
    }: {
      refundId: string;
      amount: number;
      orderId: string;
    }) => {
      if (!user?.id || !wallet?.id) throw new Error("Wallet not available");

      // Create wallet transaction (ledger entry) - balance syncs via trigger
      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          customer_id: user.id,
          type: "refund",
          amount,
          description: `Refund credited for order ${orderId.slice(0, 8)}`,
          status: "success",
          reference_id: refundId,
          reference_type: "refund",
        });

      if (txError) throw txError;

      // Note: Wallet balance is now auto-synced via database trigger (sync_wallet_balance_from_ledger)
      // No direct balance update needed - this ensures ledger is source of truth

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast({
        title: "Refund Credited",
        description: "The refund has been added to your wallet balance.",
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

  // Withdraw to bank account - LEDGER-FIRST APPROACH
  // Wallet balance will be auto-synced via database trigger
  const withdrawToBank = useMutation({
    mutationFn: async ({
      bankAccountId,
      amount,
    }: {
      bankAccountId: string;
      amount: number;
    }) => {
      if (!user?.id || !wallet?.id) throw new Error("Wallet not available");
      
      if (amount <= 0) throw new Error("Amount must be greater than 0");

      // Check for pending withdrawals first
      const { data: pendingWithdrawals, error: pendingError } = await supabase
        .from("wallet_transactions")
        .select("id, amount")
        .eq("customer_id", user.id)
        .eq("type", "withdrawal")
        .eq("status", "pending");

      if (pendingError) throw pendingError;

      if (pendingWithdrawals && pendingWithdrawals.length > 0) {
        const pendingTotal = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
        throw new Error(`You have ${pendingWithdrawals.length} pending withdrawal(s) totaling ₹${pendingTotal.toFixed(2)}. Please wait for them to complete.`);
      }

      // Compute current balance from ledger for accurate check
      const { data: freshWallet, error: freshWalletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("customer_id", user.id)
        .single();

      if (freshWalletError || !freshWallet) {
        throw new Error("Failed to verify wallet balance");
      }

      if (amount > freshWallet.balance) {
        throw new Error(`Insufficient balance. Available: ₹${freshWallet.balance.toFixed(2)}`);
      }

      // Verify bank account exists and is verified
      const { data: bankAccount, error: bankError } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("id", bankAccountId)
        .eq("customer_id", user.id)
        .single();

      if (bankError || !bankAccount) throw new Error("Bank account not found");
      if (bankAccount.verification_status !== "verified") {
        throw new Error("Bank account must be verified for withdrawals");
      }

      // LEDGER-FIRST: Create withdrawal transaction (ledger entry)
      // Balance will be auto-synced via database trigger
      const { data: transaction, error: txError } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: freshWallet.id,
          customer_id: user.id,
          type: "withdrawal",
          amount,
          description: `Withdrawal to ${bankAccount.bank_name} ••••${bankAccount.account_number.slice(-4)}`,
          status: "pending",
          reference_id: bankAccountId,
          reference_type: "bank_account",
          metadata: {
            bank_name: bankAccount.bank_name,
            account_last4: bankAccount.account_number.slice(-4),
            ifsc_code: bankAccount.ifsc_code,
          },
        })
        .select()
        .single();

      if (txError) {
        throw new Error("Failed to create withdrawal transaction");
      }

      // Note: Wallet balance is now auto-synced via database trigger (sync_wallet_balance_from_ledger)
      // The trigger computes: balance = SUM(credits) - SUM(debits including pending withdrawals)

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast({
        title: "Withdrawal Initiated",
        description: "Your withdrawal request has been submitted. Funds will be credited within 2-3 business days.",
      });
    },
    onError: (error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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
    pendingWithdrawals:
      transactions
        ?.filter((t) => t.type === "withdrawal" && t.status === "pending")
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
    creditFromRefund,
    withdrawToBank,
  };
}
