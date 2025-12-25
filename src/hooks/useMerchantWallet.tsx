import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface MerchantWallet {
  id: string;
  merchant_id: string;
  available_balance: number;
  pending_balance: number;
  total_paid_out: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MerchantBankAccount {
  id: string;
  merchant_id: string;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  branch_name: string | null;
  account_type: string;
  is_default: boolean;
  is_verified: boolean;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

export interface MerchantPayout {
  id: string;
  merchant_id: string;
  bank_account_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  notes: string | null;
  failure_reason: string | null;
  transaction_id: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  bank_account?: MerchantBankAccount;
}

export interface CreateBankAccountData {
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  branch_name?: string;
  account_type: string;
  is_default: boolean;
}

export interface CreatePayoutData {
  amount: number;
  bank_account_id: string;
  notes?: string;
}

const MINIMUM_WITHDRAWAL = 100; // ₹100 minimum
const PAYOUT_FEE_PERCENT = 2; // 2% fee on all payouts

export function useMerchantWallet() {
  const { user } = useMerchantAuth();
  const queryClient = useQueryClient();

  // Fetch wallet
  const { data: wallet, isLoading: isLoadingWallet } = useQuery({
    queryKey: ["merchant-wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await merchantSupabase
        .from("merchant_wallets")
        .select("*")
        .eq("merchant_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no wallet exists, create one
      if (!data && user?.id) {
        const { data: newWallet, error: createError } = await merchantSupabase
          .from("merchant_wallets")
          .insert({ merchant_id: user.id })
          .select()
          .single();
        
        if (createError) throw createError;
        return newWallet as MerchantWallet;
      }
      
      return data as MerchantWallet | null;
    },
    enabled: !!user?.id,
  });

  // Fetch bank accounts
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery({
    queryKey: ["merchant-bank-accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await merchantSupabase
        .from("merchant_bank_accounts")
        .select("*")
        .eq("merchant_id", user?.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MerchantBankAccount[];
    },
    enabled: !!user?.id,
  });

  // Fetch payouts
  const { data: payouts, isLoading: isLoadingPayouts } = useQuery({
    queryKey: ["merchant-payouts", user?.id],
    queryFn: async () => {
      const { data, error } = await merchantSupabase
        .from("merchant_payouts")
        .select(`
          *,
          bank_account:merchant_bank_accounts(*)
        `)
        .eq("merchant_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MerchantPayout[];
    },
    enabled: !!user?.id,
  });

  // Get last payout
  const lastPayout = payouts?.find(p => p.status === "completed") || null;

  // Get default bank account
  const defaultBankAccount = bankAccounts?.find(ba => ba.is_default) || bankAccounts?.[0] || null;

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const walletChannel = merchantSupabase
      .channel(`merchant-wallet-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_wallets",
          filter: `merchant_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-wallet", user.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_bank_accounts",
          filter: `merchant_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-bank-accounts", user.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_payouts",
          filter: `merchant_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["merchant-payouts", user.id] });
        }
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(walletChannel);
    };
  }, [user?.id, queryClient]);

  // Add bank account
  const addBankAccount = useMutation({
    mutationFn: async (data: CreateBankAccountData) => {
      if (!user?.id) throw new Error("Not authenticated");

      // If setting as default, unset other defaults first
      if (data.is_default) {
        await merchantSupabase
          .from("merchant_bank_accounts")
          .update({ is_default: false })
          .eq("merchant_id", user.id);
      }

      const { data: account, error } = await merchantSupabase
        .from("merchant_bank_accounts")
        .insert({
          merchant_id: user.id,
          ...data,
          verification_status: "pending",
          is_verified: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate async verification (in production, this would be a webhook)
      setTimeout(async () => {
        await merchantSupabase
          .from("merchant_bank_accounts")
          .update({ 
            verification_status: "verified",
            is_verified: true 
          })
          .eq("id", account.id);
      }, 5000);

      return account as MerchantBankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-bank-accounts"] });
      toast({
        title: "Bank Account Added",
        description: "Your bank account has been added and is being verified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add bank account.",
        variant: "destructive",
      });
    },
  });

  // Update bank account
  const updateBankAccount = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateBankAccountData> }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // If setting as default, unset other defaults first
      if (data.is_default) {
        await merchantSupabase
          .from("merchant_bank_accounts")
          .update({ is_default: false })
          .eq("merchant_id", user.id);
      }

      const { data: account, error } = await merchantSupabase
        .from("merchant_bank_accounts")
        .update(data)
        .eq("id", id)
        .eq("merchant_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return account as MerchantBankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-bank-accounts"] });
      toast({
        title: "Bank Account Updated",
        description: "Your bank account has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bank account.",
        variant: "destructive",
      });
    },
  });

  // Delete bank account
  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await merchantSupabase
        .from("merchant_bank_accounts")
        .delete()
        .eq("id", id)
        .eq("merchant_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-bank-accounts"] });
      toast({
        title: "Bank Account Removed",
        description: "Your bank account has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove bank account.",
        variant: "destructive",
      });
    },
  });

  // Create payout (withdrawal) - BB-WAL-01/02 FIX: Atomic balance check and deduction
  const createPayout = useMutation({
    mutationFn: async (data: CreatePayoutData) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!wallet) throw new Error("Wallet not found");

      if (data.amount < MINIMUM_WITHDRAWAL) {
        throw new Error(`Minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}`);
      }

      // BB-WAL-01 FIX: Check for any pending payouts to prevent double withdrawal
      const { data: pendingPayouts, error: pendingError } = await merchantSupabase
        .from("merchant_payouts")
        .select("id, amount, status")
        .eq("merchant_id", user.id)
        .eq("status", "processing");

      if (pendingError) throw pendingError;

      if (pendingPayouts && pendingPayouts.length > 0) {
        const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
        throw new Error(`You have ${pendingPayouts.length} pending payout(s) totaling ₹${pendingTotal.toFixed(2)}. Please wait for them to complete.`);
      }

      // BB-WAL-02 FIX: Re-fetch wallet balance atomically to prevent race condition
      const { data: freshWallet, error: freshWalletError } = await merchantSupabase
        .from("merchant_wallets")
        .select("*")
        .eq("merchant_id", user.id)
        .single();

      if (freshWalletError || !freshWallet) {
        throw new Error("Failed to verify wallet balance");
      }

      if (data.amount > freshWallet.available_balance) {
        throw new Error(`Insufficient balance. Available: ₹${freshWallet.available_balance.toFixed(2)}`);
      }

      const bankAccount = bankAccounts?.find(ba => ba.id === data.bank_account_id);
      if (!bankAccount?.is_verified) {
        throw new Error("Bank account must be verified for withdrawals");
      }

      const fee = data.amount * (PAYOUT_FEE_PERCENT / 100);
      const netAmount = data.amount - fee;

      // BB-WAL-01 FIX: Atomic wallet update with balance check condition
      const { data: updatedWallet, error: walletError } = await merchantSupabase
        .from("merchant_wallets")
        .update({
          available_balance: freshWallet.available_balance - data.amount,
          pending_balance: freshWallet.pending_balance + data.amount,
        })
        .eq("id", freshWallet.id)
        .gte("available_balance", data.amount) // Atomic check
        .select()
        .single();

      if (walletError || !updatedWallet) {
        throw new Error("Balance changed during processing. Please try again.");
      }

      // Create payout record after successful balance deduction
      const { data: payout, error: payoutError } = await merchantSupabase
        .from("merchant_payouts")
        .insert({
          merchant_id: user.id,
          bank_account_id: data.bank_account_id,
          amount: data.amount,
          fee,
          net_amount: netAmount,
          notes: data.notes,
          status: "processing",
          transaction_id: `TXN${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
        })
        .select()
        .single();

      if (payoutError) {
        // Rollback wallet update on payout creation failure
        await merchantSupabase
          .from("merchant_wallets")
          .update({
            available_balance: freshWallet.available_balance,
            pending_balance: freshWallet.pending_balance,
          })
          .eq("id", freshWallet.id);
        throw payoutError;
      }

      // Simulate async payout processing (in production, this would be a webhook)
      setTimeout(async () => {
        const { data: currentWallet } = await merchantSupabase
          .from("merchant_wallets")
          .select("*")
          .eq("id", freshWallet.id)
          .single();

        if (currentWallet) {
          await merchantSupabase
            .from("merchant_wallets")
            .update({
              pending_balance: Math.max(0, currentWallet.pending_balance - data.amount),
              total_paid_out: currentWallet.total_paid_out + netAmount,
            })
            .eq("id", freshWallet.id);
        }

        await merchantSupabase
          .from("merchant_payouts")
          .update({ 
            status: "completed",
            processed_at: new Date().toISOString()
          })
          .eq("id", payout.id);
      }, 10000);

      return payout as MerchantPayout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-payouts"] });
      toast({
        title: "Withdrawal Submitted",
        description: "Your withdrawal request is being processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal.",
        variant: "destructive",
      });
    },
  });

  return {
    wallet,
    isLoadingWallet,
    bankAccounts: bankAccounts || [],
    isLoadingBankAccounts,
    payouts: payouts || [],
    isLoadingPayouts,
    lastPayout,
    defaultBankAccount,
    addBankAccount: addBankAccount.mutate,
    isAddingBankAccount: addBankAccount.isPending,
    updateBankAccount: updateBankAccount.mutate,
    isUpdatingBankAccount: updateBankAccount.isPending,
    deleteBankAccount: deleteBankAccount.mutate,
    isDeletingBankAccount: deleteBankAccount.isPending,
    createPayout: createPayout.mutateAsync,
    isCreatingPayout: createPayout.isPending,
    MINIMUM_WITHDRAWAL,
    PAYOUT_FEE_PERCENT,
  };
}
