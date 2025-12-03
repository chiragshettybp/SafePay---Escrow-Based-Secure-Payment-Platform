import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface DraftOrder {
  merchant_id: string;
  merchant_name: string;
  amount: number;
  product_name: string;
  product_description?: string;
}

export interface MerchantOption {
  id: string;
  name: string;
}

export function usePaymentFlow() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);

  // Fetch merchants (users with merchant role) + demo merchants
  const { data: merchants, isLoading: isMerchantsLoading } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'merchant');

      if (error) throw error;

      let merchantList: MerchantOption[] = [];

      // Get profiles for merchant users
      const merchantIds = data.map(r => r.user_id);
      if (merchantIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', merchantIds);

        if (!profileError && profiles) {
          merchantList = profiles.map(p => ({
            id: p.user_id,
            name: p.full_name || `Merchant ${p.user_id.slice(0, 8)}`,
          }));
        }
      }

      // Add demo merchants for testing
      const demoMerchants: MerchantOption[] = [
        { id: '00000000-0000-0000-0000-000000000001', name: 'TechStore Pro' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Digital Services Co.' },
        { id: '00000000-0000-0000-0000-000000000003', name: 'Creative Agency Hub' },
      ];

      return [...merchantList, ...demoMerchants];
    },
    enabled: !!user?.id,
  });

  // Create draft order
  const createDraft = useMutation({
    mutationFn: async (draft: DraftOrder) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          merchant_id: draft.merchant_id,
          merchant_name: draft.merchant_name,
          amount: draft.amount,
          product_name: draft.product_name,
          product_description: draft.product_description || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setDraftOrderId(data.id);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/payment/review/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create payment draft. Please try again.",
        variant: "destructive",
      });
      console.error("Draft creation error:", error);
    },
  });

  // Fetch draft order for review
  const useDraftOrder = (orderId: string) => {
    return useQuery({
      queryKey: ['draft-order', orderId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('customer_id', user?.id)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
      enabled: !!user?.id && !!orderId,
    });
  };

  // Confirm payment and lock escrow
  const confirmPayment = useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get the order details first
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!order) throw new Error("Order not found");

      // Update order status to escrow_locked
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'escrow_locked' })
        .eq('id', orderId)
        .eq('customer_id', user.id);

      if (updateError) throw updateError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          customer_id: user.id,
          merchant_id: order.merchant_id,
          amount: order.amount,
          status: 'locked',
          transaction_reference: `TXN-${Date.now()}-${orderId.slice(0, 8)}`,
        });

      if (paymentError) throw paymentError;

      // Create notification for customer
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Payment Locked in Escrow',
          message: `Your payment of $${order.amount} to ${order.merchant_name} has been locked in escrow.`,
          type: 'payment',
          order_id: orderId,
        });

      return { orderId, order };
    },
    onSuccess: ({ orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      navigate(`/payment/success/${orderId}`);
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      console.error("Payment confirmation error:", error);
    },
  });

  // Delete draft order (cleanup)
  const deleteDraft = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('customer_id', user?.id)
        .eq('status', 'draft');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    merchants: merchants || [],
    isMerchantsLoading,
    createDraft: createDraft.mutate,
    isCreatingDraft: createDraft.isPending,
    useDraftOrder,
    confirmPayment: confirmPayment.mutate,
    isConfirmingPayment: confirmPayment.isPending,
    deleteDraft: deleteDraft.mutate,
    draftOrderId,
  };
}
