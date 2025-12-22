import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminPayout {
  id: string;
  merchant_id: string;
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
  merchant?: {
    id: string;
    user_id: string;
    business_name: string;
    email: string;
    status: string;
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
}

export interface PayoutFilters {
  status?: string;
  search?: string;
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
      
      let query = supabase
        .from('merchant_payouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.amountMin) {
        query = query.gte('amount', filters.amountMin);
      }

      if (filters.amountMax) {
        query = query.lte('amount', filters.amountMax);
      }

      const { data: payoutsData, error: payoutsError } = await query;

      if (payoutsError) throw payoutsError;

      // Fetch related merchant data
      const merchantIds = [...new Set(payoutsData?.map(p => p.merchant_id) || [])];
      const bankAccountIds = [...new Set(payoutsData?.map(p => p.bank_account_id) || [])];

      const [merchantsResult, bankAccountsResult, walletsResult] = await Promise.all([
        supabase.from('merchants').select('id, user_id, business_name, email, status').in('user_id', merchantIds),
        supabase.from('merchant_bank_accounts').select('id, bank_name, account_number, account_holder_name, ifsc_code').in('id', bankAccountIds),
        supabase.from('merchant_wallets').select('id, merchant_id, available_balance, pending_balance, total_paid_out').in('merchant_id', merchantIds)
      ]);

      const merchantsMap = new Map(merchantsResult.data?.map(m => [m.user_id, m]) || []);
      const bankAccountsMap = new Map(bankAccountsResult.data?.map(b => [b.id, b]) || []);
      const walletsMap = new Map(walletsResult.data?.map(w => [w.merchant_id, w]) || []);

      let enrichedPayouts = (payoutsData || []).map(payout => ({
        ...payout,
        merchant: merchantsMap.get(payout.merchant_id),
        bank_account: bankAccountsMap.get(payout.bank_account_id),
        wallet: walletsMap.get(payout.merchant_id)
      }));

      // Apply search filter client-side for merchant name
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        enrichedPayouts = enrichedPayouts.filter(p => 
          p.merchant?.business_name?.toLowerCase().includes(searchLower) ||
          p.id.toLowerCase().includes(searchLower) ||
          p.merchant_id.toLowerCase().includes(searchLower)
        );
      }

      setPayouts(enrichedPayouts);
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
  }, [filters.status, filters.search, filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax]);

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

      const { data: payoutData, error: payoutError } = await supabase
        .from('merchant_payouts')
        .select('*')
        .eq('id', payoutId)
        .single();

      if (payoutError) throw payoutError;

      // Fetch related data
      const [merchantResult, bankAccountResult, walletResult, previousPayoutsResult] = await Promise.all([
        supabase.from('merchants').select('id, user_id, business_name, email, status').eq('user_id', payoutData.merchant_id).single(),
        supabase.from('merchant_bank_accounts').select('id, bank_name, account_number, account_holder_name, ifsc_code').eq('id', payoutData.bank_account_id).single(),
        supabase.from('merchant_wallets').select('id, merchant_id, available_balance, pending_balance, total_paid_out').eq('merchant_id', payoutData.merchant_id).single(),
        supabase.from('merchant_payouts').select('id, amount, status, created_at').eq('merchant_id', payoutData.merchant_id).neq('id', payoutId).order('created_at', { ascending: false }).limit(5)
      ]);

      const enrichedPayout: AdminPayout = {
        ...payoutData,
        merchant: merchantResult.data || undefined,
        bank_account: bankAccountResult.data || undefined,
        wallet: walletResult.data || undefined
      };

      setPayout(enrichedPayout);
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
