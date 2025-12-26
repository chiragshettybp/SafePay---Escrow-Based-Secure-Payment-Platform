import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantSupabase } from '@/integrations/supabase/merchantClient';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface MerchantCheckoutConfig {
  id: string;
  merchant_id: string;
  
  // Login settings
  login_otp_enabled: boolean;
  login_guest_checkout_enabled: boolean;
  login_returning_user_autologin: boolean;
  login_require_before_payment: boolean;
  login_otp_retry_limit: number;
  login_otp_cooldown_seconds: number;
  login_guest_max_order_value: number;
  login_autolink_by_phone: boolean;
  
  // Payment method ordering
  payment_methods_order: string[];
  payment_upi_enabled: boolean;
  payment_cards_enabled: boolean;
  payment_wallets_enabled: boolean;
  payment_emi_enabled: boolean;
  payment_netbanking_enabled: boolean;
  payment_reorder_by_success_rate: boolean;
  payment_reorder_by_device: boolean;
  payment_reorder_by_value: boolean;
  
  // Prepaid nudges
  prepaid_nudges_enabled: boolean;
  prepaid_discount_enabled: boolean;
  prepaid_urgency_enabled: boolean;
  prepaid_discount_type: 'percentage' | 'fixed';
  prepaid_discount_value: number;
  prepaid_message: string;
  prepaid_min_order_value: number;
  prepaid_first_time_only: boolean;
  
  created_at: string;
  updated_at: string;
}

type ConfigUpdate = Partial<Omit<MerchantCheckoutConfig, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>>;

export function useMerchantCheckoutConfig(merchantId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch config
  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ['merchant-checkout-config', merchantId],
    queryFn: async () => {
      if (!merchantId) return null;

      const { data, error } = await merchantSupabase
        .from('merchant_checkout_config')
        .select('*')
        .eq('merchant_id', merchantId)
        .maybeSingle();

      if (error) throw error;
      
      // If no config exists, create default
      if (!data) {
        const { data: newConfig, error: insertError } = await merchantSupabase
          .from('merchant_checkout_config')
          .insert({ merchant_id: merchantId })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newConfig as MerchantCheckoutConfig;
      }
      
      return data as MerchantCheckoutConfig;
    },
    enabled: !!merchantId,
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: ConfigUpdate) => {
      if (!merchantId || !config) throw new Error('No config to update');

      const { data, error } = await merchantSupabase
        .from('merchant_checkout_config')
        .update(updates)
        .eq('merchant_id', merchantId)
        .select()
        .single();

      if (error) throw error;
      return data as MerchantCheckoutConfig;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['merchant-checkout-config', merchantId], data);
      toast.success('Settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error('Config update error:', error);
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!merchantId) return;

    const channel = merchantSupabase
      .channel(`checkout-config-${merchantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'merchant_checkout_config',
          filter: `merchant_id=eq.${merchantId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(channel);
    };
  }, [merchantId, refetch]);

  // Helper to update a single field
  const updateField = <K extends keyof ConfigUpdate>(key: K, value: ConfigUpdate[K]) => {
    updateConfigMutation.mutate({ [key]: value } as ConfigUpdate);
  };

  // Batch update
  const updateConfig = (updates: ConfigUpdate) => {
    updateConfigMutation.mutate(updates);
  };

  // Update payment method order
  const updatePaymentOrder = (order: string[]) => {
    updateConfigMutation.mutate({ payment_methods_order: order });
  };

  // Toggle payment method
  const togglePaymentMethod = (method: string, enabled: boolean) => {
    const key = `payment_${method}_enabled` as keyof ConfigUpdate;
    updateConfigMutation.mutate({ [key]: enabled } as ConfigUpdate);
  };

  return {
    config,
    isLoading,
    isSaving: updateConfigMutation.isPending,
    updateField,
    updateConfig,
    updatePaymentOrder,
    togglePaymentMethod,
    refetch,
  };
}
