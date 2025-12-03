import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";

export type OrderStatus = 'pending' | 'in_progress' | 'delivered' | 'completed' | 'disputed' | 'refunded' | 'cancelled';

export interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  merchant_name: string;
  product_name: string;
  product_description: string | null;
  amount: number;
  status: OrderStatus;
  expected_delivery_date: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderMetrics {
  total: number;
  pending: number;
  completed: number;
  refunded: number;
}

export function useOrders(statusFilter?: OrderStatus | null) {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user?.id,
  });

  const { data: metrics } = useQuery({
    queryKey: ['order-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, pending: 0, completed: 0, refunded: 0 };

      const { data, error } = await supabase
        .from('orders')
        .select('status')
        .eq('customer_id', user.id);

      if (error) throw error;

      const metricsData: OrderMetrics = {
        total: data.length,
        pending: data.filter(o => o.status === 'pending' || o.status === 'in_progress').length,
        completed: data.filter(o => o.status === 'completed').length,
        refunded: data.filter(o => o.status === 'refunded').length,
      };

      return metricsData;
    },
    enabled: !!user?.id,
  });

  // Confirm delivery mutation
  const confirmDelivery = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed' as OrderStatus,
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('customer_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-metrics'] });
      toast({
        title: "Delivery Confirmed",
        description: "The order has been marked as completed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to confirm delivery. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Request refund mutation
  const requestRefund = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'disputed' as OrderStatus })
        .eq('id', orderId)
        .eq('customer_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-metrics'] });
      toast({
        title: "Refund Requested",
        description: "Your refund request has been submitted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to request refund. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Order update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-metrics'] });
          
          if (payload.eventType === 'UPDATE') {
            const newOrder = payload.new as Order;
            toast({
              title: "Order Updated",
              description: `Order status changed to ${newOrder.status.replace('_', ' ')}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    orders: orders || [],
    metrics: metrics || { total: 0, pending: 0, completed: 0, refunded: 0 },
    isLoading,
    error,
    refetch,
    confirmDelivery: confirmDelivery.mutate,
    requestRefund: requestRefund.mutate,
    isConfirming: confirmDelivery.isPending,
    isRequestingRefund: requestRefund.isPending,
  };
}

export function useOrder(orderId: string) {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('customer_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as Order | null;
    },
    enabled: !!user?.id && !!orderId,
  });
}
