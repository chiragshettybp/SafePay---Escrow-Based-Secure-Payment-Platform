import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";

export type OrderStatus = 'pending' | 'in_progress' | 'delivered' | 'completed' | 'disputed' | 'refunded' | 'cancelled' | 'draft' | 'escrow_locked';

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

  // Confirm delivery mutation - releases escrow to merchant
  const confirmDelivery = useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Call the release-escrow edge function
      const { data, error } = await supabase.functions.invoke('release-escrow', {
        body: {
          orderId,
          reason: 'delivery_confirmed'
        }
      });

      if (error) throw error;
      
      // Check if the response indicates an error
      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      if (data?.alreadyReleased) {
        toast({
          title: "Already Completed",
          description: "This order has already been completed.",
        });
      } else {
        toast({
          title: "Delivery Confirmed",
          description: "Payment has been released to the merchant.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm delivery. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Request refund mutation - This should navigate to dispute flow, not directly update status
  // Direct status updates are blocked by RLS policy - must go through proper dispute creation
  const requestRefund = useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Verify order ownership and valid status for dispute
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, customer_id')
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .single();

      if (orderError || !order) {
        throw new Error("Order not found");
      }

      // Only allow disputes on orders that are in escrow or delivered
      const disputeableStatuses = ['escrow_locked', 'in_progress', 'delivered'];
      if (!disputeableStatuses.includes(order.status)) {
        throw new Error(`Cannot dispute an order with status: ${order.status}`);
      }

      return { orderId, shouldNavigate: true };
    },
    onSuccess: ({ orderId }) => {
      // Navigate to dispute creation page instead of directly updating status
      // The dispute creation will handle the status update server-side
      toast({
        title: "Opening Dispute Form",
        description: "Please provide details about your issue.",
      });
      // Note: Navigation should be handled by the calling component
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate dispute. Please try again.",
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
