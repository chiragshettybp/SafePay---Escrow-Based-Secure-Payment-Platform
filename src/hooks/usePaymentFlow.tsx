import { useState, useRef } from "react";
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

interface OrderSettings {
  min_order_amount: number;
  auto_confirm_days: number;
  dispute_window_days: number;
  high_value_threshold: number;
}

const DEFAULT_SETTINGS: OrderSettings = {
  min_order_amount: 100,
  auto_confirm_days: 7,
  dispute_window_days: 14,
  high_value_threshold: 50000,
};

export function usePaymentFlow() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  
  // Refs for preventing concurrent operations
  const isCreatingDraftRef = useRef(false);
  const isConfirmingPaymentRef = useRef(false);
  const isDeletingDraftRef = useRef(false);

  // Fetch order settings
  const { data: orderSettings } = useQuery({
    queryKey: ['order-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Error fetching order settings:', error);
        return DEFAULT_SETTINGS;
      }

      const settings: OrderSettings = { ...DEFAULT_SETTINGS };
      data?.forEach(setting => {
        if (setting.setting_key === 'min_order_amount') {
          settings.min_order_amount = parseFloat(setting.setting_value) || DEFAULT_SETTINGS.min_order_amount;
        } else if (setting.setting_key === 'auto_confirm_days') {
          settings.auto_confirm_days = parseInt(setting.setting_value) || DEFAULT_SETTINGS.auto_confirm_days;
        } else if (setting.setting_key === 'dispute_window_days') {
          settings.dispute_window_days = parseInt(setting.setting_value) || DEFAULT_SETTINGS.dispute_window_days;
        } else if (setting.setting_key === 'high_value_threshold') {
          settings.high_value_threshold = parseFloat(setting.setting_value) || DEFAULT_SETTINGS.high_value_threshold;
        }
      });

      return settings;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

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
    retry: 2,
  });

  // Create draft order with validation and concurrent operation guard
  const createDraft = useMutation({
    mutationFn: async (draft: DraftOrder) => {
      // Prevent concurrent draft creation
      if (isCreatingDraftRef.current) {
        throw new Error("Draft creation already in progress");
      }
      isCreatingDraftRef.current = true;
      
      try {
        if (!user?.id) throw new Error("Not authenticated");

        const settings = orderSettings || DEFAULT_SETTINGS;

        // Validate minimum order amount
        if (draft.amount < settings.min_order_amount) {
          throw new Error(`Minimum order amount is ₹${settings.min_order_amount}`);
        }

        // Validate amount is positive
        if (draft.amount <= 0) {
          throw new Error("Amount must be greater than 0");
        }

        // Validate product name
        if (!draft.product_name || draft.product_name.trim().length < 2) {
          throw new Error("Product name must be at least 2 characters");
        }

        // Check if merchant exists and is active
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('user_id, status')
          .eq('user_id', draft.merchant_id)
          .single();

        if (merchantError || !merchant) {
          throw new Error("Merchant not found");
        }

        if (merchant.status !== 'active') {
          throw new Error("Merchant is not available for orders");
        }

        // Check if merchant is banned
        const { data: banRecord } = await supabase
          .from('user_bans')
          .select('id')
          .eq('user_id', draft.merchant_id)
          .eq('is_active', true)
          .maybeSingle();

        if (banRecord) {
          throw new Error("Merchant is currently suspended");
        }

        const { data, error } = await supabase
          .from('orders')
          .insert({
            customer_id: user.id,
            merchant_id: draft.merchant_id,
            merchant_name: draft.merchant_name.trim(),
            amount: draft.amount,
            product_name: draft.product_name.trim(),
            product_description: draft.product_description?.trim() || null,
            status: 'draft',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } finally {
        isCreatingDraftRef.current = false;
      }
    },
    onSuccess: (data) => {
      setDraftOrderId(data.id);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/payment/review/${data.id}`);
    },
    onError: (error: Error) => {
      const message = error.message === "Not authenticated" 
        ? "Please log in to create a payment."
        : error.message || "Failed to create payment draft. Please try again.";
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
      retry: 2,
    });
  };

  // Confirm payment and lock escrow - uses atomic server-side edge function with guards
  const confirmPayment = useMutation({
    mutationFn: async (orderId: string) => {
      // Prevent concurrent payment confirmations
      if (isConfirmingPaymentRef.current) {
        throw new Error("Payment confirmation already in progress");
      }
      isConfirmingPaymentRef.current = true;
      
      try {
        if (!user?.id) throw new Error("Not authenticated");

        // Validate orderId format
        if (!orderId || typeof orderId !== 'string' || orderId.length < 10) {
          throw new Error("Invalid order ID");
        }

        // Get current session for auth header
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expired. Please log in again.");

        // Generate idempotency key
        const idempotencyKey = `confirm-${orderId}-${user.id}-${Date.now()}`;

        // Call atomic edge function with retry logic
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(
              `https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/confirm-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ',
                  'x-idempotency-key': idempotencyKey,
                },
                body: JSON.stringify({ orderId }),
              }
            );

            const data = await response.json();

            if (!response.ok) {
              // If already processed, treat as success (idempotent)
              if (data.alreadyProcessed) {
                return { orderId, ...data, idempotent: true };
              }
              throw new Error(data.error || 'Payment confirmation failed');
            }

            return { orderId, ...data };
          } catch (err) {
            lastError = err as Error;
            // Only retry on network errors, not business logic errors
            if (lastError.message.includes('Payment') || lastError.message.includes('Order')) {
              throw lastError;
            }
            // Wait before retry (exponential backoff)
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        }
        throw lastError || new Error('Payment confirmation failed after retries');
      } finally {
        isConfirmingPaymentRef.current = false;
      }
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

  // Delete draft order (cleanup) with guard
  const deleteDraft = useMutation({
    mutationFn: async (orderId: string) => {
      // Prevent concurrent deletions
      if (isDeletingDraftRef.current) {
        throw new Error("Draft deletion already in progress");
      }
      isDeletingDraftRef.current = true;
      
      try {
        if (!user?.id) throw new Error("Not authenticated");

        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId)
          .eq('customer_id', user.id)
          .eq('status', 'draft');

        if (error) throw error;
      } finally {
        isDeletingDraftRef.current = false;
      }
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
    orderSettings: orderSettings || DEFAULT_SETTINGS,
  };
}
