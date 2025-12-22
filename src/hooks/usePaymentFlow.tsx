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

  // Fetch real merchants from the merchants table
  const { data: merchants, isLoading: isMerchantsLoading } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      // Fetch approved/active merchants from the merchants table
      const { data, error } = await supabase
        .from('merchants')
        .select('user_id, business_name, email, status')
        .eq('status', 'active');

      if (error) throw error;

      // Map to MerchantOption format
      const merchantList: MerchantOption[] = (data || []).map(m => ({
        id: m.user_id,
        name: m.business_name,
      }));

      return merchantList;
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
    onError: (error: Error) => {
      const message = error.message === "Not authenticated" 
        ? "Please log in to create a payment."
        : "Failed to create payment draft. Please try again.";
      toast({
        title: "Error",
        description: message,
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

      // Check if already processed to prevent duplicates
      if (order.status !== 'draft') {
        throw new Error("Order has already been processed");
      }

      // Check if payment already exists for this order
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingPayment) {
        throw new Error("Payment already exists for this order");
      }

      // Update order status to escrow_locked
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'escrow_locked' })
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .eq('status', 'draft'); // Only update if still draft (prevents race conditions)

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

      // Update merchant's escrow account - credit the escrow
      const { data: escrowAccount } = await supabase
        .from('escrow_accounts')
        .select('*')
        .eq('merchant_id', order.merchant_id)
        .maybeSingle();

      if (escrowAccount) {
        // Update escrow balance
        await supabase
          .from('escrow_accounts')
          .update({
            total_balance: escrowAccount.total_balance + order.amount,
            locked_balance: escrowAccount.locked_balance + order.amount,
          })
          .eq('id', escrowAccount.id);

        // Create escrow transaction record
        await supabase
          .from('escrow_transactions')
          .insert({
            escrow_account_id: escrowAccount.id,
            order_id: orderId,
            transaction_type: 'credit',
            amount: order.amount,
            balance_before: escrowAccount.total_balance,
            balance_after: escrowAccount.total_balance + order.amount,
            reason: 'Payment locked in escrow',
            created_by: user.id,
          });
      }

      // Create notification for customer
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Payment Locked in Escrow',
          message: `Your payment of ₹${order.amount.toFixed(2)} to ${order.merchant_name} has been locked in escrow.`,
          type: 'payment',
          order_id: orderId,
        });

      // Create notification for merchant
      await supabase
        .from('merchant_notifications')
        .insert({
          merchant_id: order.merchant_id,
          title: 'New Order Received',
          body: `New order of ₹${order.amount.toFixed(2)} for ${order.product_name} has been placed. Funds are locked in escrow.`,
          type: 'order',
          related_order_id: orderId,
        });

      return { orderId, order };
    },
    onSuccess: ({ orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
      navigate(`/payment/success/${orderId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
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
