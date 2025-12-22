import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminPayout {
  id: string;
  user_id: string;
  user_type: 'merchant' | 'customer';
  bank_account_id: string;
  amount: number;
  net_amount: number;
  fee: number;
  status: string;
  notes: string | null;
  transaction_id: string | null;
  failure_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  merchant?: {
    id: string;
    user_id: string;
    business_name: string;
    email: string;
    status: string;
  };
  customer?: {
    full_name: string | null;
  };
  bank_account?: {
    id: string;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    ifsc_code: string;
  };
  wallet?: {
    id: string;
    available_balance: number;
    pending_balance: number;
    total_paid_out: number;
  };
  customer_wallet?: {
    id: string;
    balance: number;
  };
}

export interface PayoutFilters {
  status?: string;
  search?: string;
  userType?: 'all' | 'merchant' | 'customer';
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export function useAdminPayouts(filters: PayoutFilters = {}) {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const allPayouts: AdminPayout[] = [];

      // Fetch merchant payouts
      if (!filters.userType || filters.userType === 'all' || filters.userType === 'merchant') {
        let merchantQuery = supabase
          .from('merchant_payouts')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters.status && filters.status !== 'all') {
          merchantQuery = merchantQuery.eq('status', filters.status);
        }
        if (filters.dateFrom) {
          merchantQuery = merchantQuery.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
          merchantQuery = merchantQuery.lte('created_at', filters.dateTo);
        }
        if (filters.amountMin) {
          merchantQuery = merchantQuery.gte('amount', filters.amountMin);
        }
        if (filters.amountMax) {
          merchantQuery = merchantQuery.lte('amount', filters.amountMax);
        }

        const { data: merchantPayoutsData, error: merchantError } = await merchantQuery;
        if (merchantError) {
          console.error('Error fetching merchant payouts:', merchantError);
        }

        // Fetch related merchant data
        const merchantIds = [...new Set(merchantPayoutsData?.map(p => p.merchant_id) || [])];
        const bankAccountIds = [...new Set(merchantPayoutsData?.map(p => p.bank_account_id) || [])];

        const [merchantsResult, bankAccountsResult, walletsResult] = await Promise.all([
          merchantIds.length > 0 
            ? supabase.from('merchants').select('id, user_id, business_name, email, status').in('user_id', merchantIds)
            : { data: [] as { id: string; user_id: string; business_name: string; email: string; status: string }[] },
          bankAccountIds.length > 0 
            ? supabase.from('merchant_bank_accounts').select('id, bank_name, account_number, account_holder_name, ifsc_code').in('id', bankAccountIds)
            : { data: [] as { id: string; bank_name: string; account_number: string; account_holder_name: string; ifsc_code: string }[] },
          merchantIds.length > 0 
            ? supabase.from('merchant_wallets').select('id, merchant_id, available_balance, pending_balance, total_paid_out').in('merchant_id', merchantIds)
            : { data: [] as { id: string; merchant_id: string; available_balance: number; pending_balance: number; total_paid_out: number }[] }
        ]);

        const merchantsMap = new Map((merchantsResult.data || []).map(m => [m.user_id, m]));
        const bankAccountsMap = new Map((bankAccountsResult.data || []).map(b => [b.id, b]));
        const walletsMap = new Map((walletsResult.data || []).map(w => [w.merchant_id, w]));

        for (const payout of merchantPayoutsData || []) {
          const merchant = merchantsMap.get(payout.merchant_id);
          const bankAccount = bankAccountsMap.get(payout.bank_account_id);
          const wallet = walletsMap.get(payout.merchant_id);
          allPayouts.push({
            id: payout.id,
            user_id: payout.merchant_id,
            user_type: 'merchant',
            bank_account_id: payout.bank_account_id,
            amount: payout.amount,
            net_amount: payout.net_amount,
            fee: payout.fee || 0,
            status: payout.status,
            notes: payout.notes,
            transaction_id: payout.transaction_id,
            failure_reason: payout.failure_reason,
            processed_at: payout.processed_at,
            created_at: payout.created_at,
            updated_at: payout.updated_at,
            user_name: merchant?.business_name || 'Unknown Merchant',
            user_email: merchant?.email,
            merchant: merchant || undefined,
            bank_account: bankAccount || undefined,
            wallet: wallet ? { id: wallet.id, available_balance: wallet.available_balance, pending_balance: wallet.pending_balance, total_paid_out: wallet.total_paid_out } : undefined
          });
        }
      }

      // Fetch customer withdrawals
      if (!filters.userType || filters.userType === 'all' || filters.userType === 'customer') {
        let customerQuery = supabase
          .from('wallet_transactions')
          .select('*')
          .eq('type', 'withdrawal')
          .order('created_at', { ascending: false });

        if (filters.status && filters.status !== 'all') {
          customerQuery = customerQuery.eq('status', filters.status);
        }
        if (filters.dateFrom) {
          customerQuery = customerQuery.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
          customerQuery = customerQuery.lte('created_at', filters.dateTo);
        }
        if (filters.amountMin) {
          customerQuery = customerQuery.gte('amount', filters.amountMin);
        }
        if (filters.amountMax) {
          customerQuery = customerQuery.lte('amount', filters.amountMax);
        }

        const { data: customerWithdrawalsData, error: customerError } = await customerQuery;
        if (customerError) {
          console.error('Error fetching customer withdrawals:', customerError);
        }

        // Fetch related customer data
        const customerIds = [...new Set(customerWithdrawalsData?.map(w => w.customer_id) || [])];
        const customerBankIds = [...new Set(customerWithdrawalsData?.map(w => w.reference_id).filter(Boolean) || [])];

        const [profilesResult, customerBankAccountsResult, customerWalletsResult] = await Promise.all([
          customerIds.length > 0 
            ? supabase.from('profiles').select('user_id, full_name').in('user_id', customerIds)
            : { data: [] as { user_id: string; full_name: string | null }[] },
          customerBankIds.length > 0 
            ? supabase.from('bank_accounts').select('id, bank_name, account_number, account_holder_name, ifsc_code').in('id', customerBankIds)
            : { data: [] as { id: string; bank_name: string; account_number: string; account_holder_name: string; ifsc_code: string }[] },
          customerIds.length > 0 
            ? supabase.from('wallets').select('id, customer_id, balance').in('customer_id', customerIds)
            : { data: [] as { id: string; customer_id: string; balance: number }[] }
        ]);

        const profilesMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));
        const customerBankAccountsMap = new Map((customerBankAccountsResult.data || []).map(b => [b.id, b]));
        const customerWalletsMap = new Map((customerWalletsResult.data || []).map(w => [w.customer_id, w]));

        for (const withdrawal of customerWithdrawalsData || []) {
          const profile = profilesMap.get(withdrawal.customer_id);
          const bankAccount = withdrawal.reference_id ? customerBankAccountsMap.get(withdrawal.reference_id) : undefined;
          const customerWallet = customerWalletsMap.get(withdrawal.customer_id);

          allPayouts.push({
            id: withdrawal.id,
            user_id: withdrawal.customer_id,
            user_type: 'customer',
            bank_account_id: withdrawal.reference_id || '',
            amount: withdrawal.amount,
            net_amount: withdrawal.amount,
            fee: 0,
            status: withdrawal.status,
            notes: withdrawal.description,
            transaction_id: null,
            failure_reason: null,
            processed_at: withdrawal.status === 'success' ? withdrawal.updated_at : null,
            created_at: withdrawal.created_at,
            updated_at: withdrawal.updated_at,
            user_name: profile?.full_name || 'Customer',
            customer: { full_name: profile?.full_name || null },
            bank_account: bankAccount || undefined,
            customer_wallet: customerWallet ? { id: customerWallet.id, balance: customerWallet.balance } : undefined
          });
        }
      }

      // Sort all payouts by created_at descending
      allPayouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply search filter client-side
      let filteredPayouts = allPayouts;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredPayouts = allPayouts.filter(p => 
          p.user_name?.toLowerCase().includes(searchLower) ||
          p.id.toLowerCase().includes(searchLower) ||
          p.user_id.toLowerCase().includes(searchLower) ||
          p.user_email?.toLowerCase().includes(searchLower)
        );
      }

      setPayouts(filteredPayouts);
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payouts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [filters.status, filters.search, filters.userType, filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-payouts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'merchant_payouts'
      }, () => {
        fetchPayouts();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallet_transactions'
      }, () => {
        fetchPayouts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { payouts, loading, refetch: fetchPayouts };
}

export function useAdminPayoutDetails(payoutId: string | undefined) {
  const [payout, setPayout] = useState<AdminPayout | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayout = async () => {
    if (!payoutId) return;

    try {
      setLoading(true);

      // First try merchant_payouts
      const { data: payoutData, error: payoutError } = await supabase
        .from('merchant_payouts')
        .select('*')
        .eq('id', payoutId)
        .maybeSingle();

      if (payoutData) {
        // It's a merchant payout
        const [merchantResult, bankAccountResult, walletResult] = await Promise.all([
          supabase.from('merchants').select('id, user_id, business_name, email, status').eq('user_id', payoutData.merchant_id).single(),
          supabase.from('merchant_bank_accounts').select('id, bank_name, account_number, account_holder_name, ifsc_code').eq('id', payoutData.bank_account_id).single(),
          supabase.from('merchant_wallets').select('id, merchant_id, available_balance, pending_balance, total_paid_out').eq('merchant_id', payoutData.merchant_id).single(),
        ]);

        const enrichedPayout: AdminPayout = {
          id: payoutData.id,
          user_id: payoutData.merchant_id,
          user_type: 'merchant',
          bank_account_id: payoutData.bank_account_id,
          amount: payoutData.amount,
          net_amount: payoutData.net_amount,
          fee: payoutData.fee || 0,
          status: payoutData.status,
          notes: payoutData.notes,
          transaction_id: payoutData.transaction_id,
          failure_reason: payoutData.failure_reason,
          processed_at: payoutData.processed_at,
          created_at: payoutData.created_at,
          updated_at: payoutData.updated_at,
          user_name: merchantResult.data?.business_name || 'Unknown Merchant',
          user_email: merchantResult.data?.email,
          merchant: merchantResult.data || undefined,
          bank_account: bankAccountResult.data || undefined,
          wallet: walletResult.data ? { id: walletResult.data.id, available_balance: walletResult.data.available_balance, pending_balance: walletResult.data.pending_balance, total_paid_out: walletResult.data.total_paid_out } : undefined
        };

        setPayout(enrichedPayout);
      } else {
        // Try wallet_transactions for customer withdrawal
        const { data: withdrawalData, error: withdrawalError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('id', payoutId)
          .eq('type', 'withdrawal')
          .maybeSingle();

        if (withdrawalData) {
          const [profileResult, bankAccountResult, walletResult] = await Promise.all([
            supabase.from('profiles').select('user_id, full_name').eq('user_id', withdrawalData.customer_id).single(),
            withdrawalData.reference_id 
              ? supabase.from('bank_accounts').select('id, bank_name, account_number, account_holder_name, ifsc_code').eq('id', withdrawalData.reference_id).single()
              : { data: null },
            supabase.from('wallets').select('id, customer_id, balance').eq('customer_id', withdrawalData.customer_id).single(),
          ]);

          const enrichedPayout: AdminPayout = {
            id: withdrawalData.id,
            user_id: withdrawalData.customer_id,
            user_type: 'customer',
            bank_account_id: withdrawalData.reference_id || '',
            amount: withdrawalData.amount,
            net_amount: withdrawalData.amount,
            fee: 0,
            status: withdrawalData.status,
            notes: withdrawalData.description,
            transaction_id: null,
            failure_reason: null,
            processed_at: withdrawalData.status === 'success' ? withdrawalData.updated_at : null,
            created_at: withdrawalData.created_at,
            updated_at: withdrawalData.updated_at,
            user_name: profileResult.data?.full_name || 'Customer',
            customer: { full_name: profileResult.data?.full_name || null },
            bank_account: bankAccountResult.data || undefined,
            customer_wallet: walletResult.data ? { id: walletResult.data.id, balance: walletResult.data.balance } : undefined
          };

          setPayout(enrichedPayout);
        } else {
          throw new Error('Payout not found');
        }
      }
    } catch (error: any) {
      console.error('Error fetching payout details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayout();
  }, [payoutId]);

  // Realtime subscription
  useEffect(() => {
    if (!payoutId) return;

    const channel = supabase
      .channel(`admin-payout-${payoutId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'merchant_payouts',
        filter: `id=eq.${payoutId}`
      }, () => {
        fetchPayout();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [payoutId]);

  return { payout, loading, refetch: fetchPayout };
}

export function usePayoutVerification() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const verifyPayout = async (
    payoutId: string,
    decision: 'approve' | 'decline',
    reason: string,
    adminNotes?: string
  ) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-payout-verify', {
        body: {
          payout_id: payoutId,
          decision,
          reason,
          admin_notes: adminNotes
        }
      });

      if (error) throw error;

      if (data.error) throw new Error(data.error);

      toast({
        title: 'Success',
        description: decision === 'approve' 
          ? 'Payout approved successfully' 
          : 'Payout declined successfully'
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error verifying payout:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process payout decision',
        variant: 'destructive'
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { verifyPayout, loading };
}
