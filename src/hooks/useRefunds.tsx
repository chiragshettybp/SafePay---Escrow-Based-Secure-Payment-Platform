import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Refund {
  id: string;
  order_id: string;
  dispute_id: string | null;
  customer_id: string;
  amount: number;
  status: 'initiated' | 'processing' | 'success' | 'failed';
  reason: string;
  failure_reason: string | null;
  retry_allowed: boolean;
  payment_method: string | null;
  payment_method_last4: string | null;
  transaction_id: string | null;
  receipt_url: string | null;
  credited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundEvent {
  id: string;
  refund_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface RefundWithOrder extends Refund {
  orders: {
    id: string;
    product_name: string;
    merchant_name: string;
    amount: number;
  };
}

export const useRefund = (refundId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: refund, isLoading, error } = useQuery({
    queryKey: ['refund', refundId],
    queryFn: async () => {
      if (!refundId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          orders (
            id,
            product_name,
            merchant_name,
            amount
          )
        `)
        .eq('id', refundId)
        .eq('customer_id', user.id)
        .single();

      if (error) throw error;
      return data as RefundWithOrder;
    },
    enabled: !!refundId,
  });

  const { data: events, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['refund-events', refundId],
    queryFn: async () => {
      if (!refundId) return [];

      const { data, error } = await supabase
        .from('refund_events')
        .select('*')
        .eq('refund_id', refundId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as RefundEvent[];
    },
    enabled: !!refundId,
  });

  // Real-time subscription for refund updates
  useEffect(() => {
    if (!refundId) return;

    const channel = supabase
      .channel(`refund-${refundId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refunds',
          filter: `id=eq.${refundId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['refund', refundId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'refund_events',
          filter: `refund_id=eq.${refundId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['refund-events', refundId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refundId, queryClient]);

  return { refund, events, isLoading, isLoadingEvents, error };
};

export const useRefunds = () => {
  const queryClient = useQueryClient();

  const { data: refunds, isLoading, error } = useQuery({
    queryKey: ['refunds'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          orders (
            id,
            product_name,
            merchant_name,
            amount
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RefundWithOrder[];
    },
  });

  const retryRefund = useMutation({
    mutationFn: async (refundId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update refund status to processing
      const { error: updateError } = await supabase
        .from('refunds')
        .update({ 
          status: 'processing',
          failure_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', refundId)
        .eq('customer_id', user.id);

      if (updateError) throw updateError;

      // Create retry event
      const { error: eventError } = await supabase
        .from('refund_events')
        .insert({
          refund_id: refundId,
          event_type: 'retry',
          title: 'Refund Retry Initiated',
          description: 'Your refund is being processed again.',
        });

      if (eventError) throw eventError;

      return refundId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      toast.success('Refund retry initiated');
    },
    onError: (error) => {
      toast.error('Failed to retry refund: ' + error.message);
    },
  });

  // Real-time subscription for all refunds
  useEffect(() => {
    const channel = supabase
      .channel('refunds-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refunds',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['refunds'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { refunds, isLoading, error, retryRefund };
};
