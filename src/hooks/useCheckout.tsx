import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CheckoutStep = 'login' | 'address' | 'payment' | 'confirmation';
export type CheckoutStatus = 'active' | 'expired' | 'completed' | 'failed' | 'abandoned';
export type PaymentMethod = 'upi' | 'card' | 'wallet' | 'emi' | 'cod' | 'netbanking';

export interface CartItem {
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string;
}

export interface ShippingAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

export interface CheckoutSession {
  id: string;
  merchant_id: string;
  user_id: string | null;
  cart_data: CartItem[];
  cart_total: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  final_amount: number;
  status: CheckoutStatus;
  current_step: CheckoutStep;
  phone_number: string | null;
  phone_snapshot: string | null; // Immutable phone snapshot for audit
  email: string | null;
  is_guest: boolean;
  phone_collected: boolean; // Replaces otp_verified
  shipping_address_id: string | null;
  shipping_name: string | null;
  shipping_address: ShippingAddress | null;
  shipping_pincode: string | null;
  delivery_estimate: string | null;
  cod_available: boolean;
  selected_payment_method: PaymentMethod | null;
  payment_attempts: number;
  last_payment_error: string | null;
  cod_verification_required: boolean;
  cod_fee: number;
  order_id: string | null;
  payment_id: string | null;
  payment_link_id: string | null; // Track if from payment link
  created_at: string;
  updated_at: string;
  expires_at: string;
  completed_at: string | null;
  merchants?: {
    id: string;
    business_name: string;
    logo_url: string | null;
  };
}

interface UseCheckoutOptions {
  sessionId?: string;
}

export function useCheckout({ sessionId }: UseCheckoutOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch session
  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ['checkout-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data: session, error: dbError } = await supabase
        .from('checkout_sessions')
        .select(`
          *,
          merchants:merchant_id (
            id,
            business_name,
            logo_url
          )
        `)
        .eq('id', sessionId)
        .single();

      if (dbError) throw dbError;

      // Fetch addresses if user is logged in
      let addresses: CustomerAddress[] = [];
      if (session?.user_id) {
        const { data: userAddresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('user_id', session.user_id)
          .order('is_default', { ascending: false });

        addresses = (userAddresses || []) as CustomerAddress[];
      }

      // Normalize JSON fields (some legacy flows stored JSON as string)
      const normalizeJson = <T,>(value: unknown, fallback: T): T => {
        if (value == null) return fallback;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value) as T;
          } catch {
            return fallback;
          }
        }
        return value as T;
      };

      const rawCart = normalizeJson<unknown>(session.cart_data, []);
      const cartArray = Array.isArray(rawCart) ? rawCart : [];
      const normalizedCart: CartItem[] = cartArray.map((item: any) => ({
        product_name: item?.product_name ?? item?.name ?? 'Item',
        quantity: Number(item?.quantity ?? 1),
        price: Number(item?.price ?? 0),
        image_url: item?.image_url ?? undefined,
      }));

      // Cast the session to our type (phone_collected is computed from phone_number)
      const typedSession: CheckoutSession = {
        ...session,
        cart_data: normalizedCart,
        shipping_address: normalizeJson<ShippingAddress | null>(session.shipping_address, null),
        merchants: session.merchants as CheckoutSession['merchants'],
        phone_collected: !!session.phone_number, // Computed field
      };

      return {
        session: typedSession,
        addresses,
      };
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      // Auto-refetch every 30s if session is active
      if (query.state.data?.session?.status === 'active') return 30000;
      return false;
    },
  });

  const session = sessionData?.session;
  const addresses = sessionData?.addresses || [];

  // Real-time subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`checkout-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[Checkout] Session updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['checkout-session', sessionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (data: {
      merchant_id: string;
      cart_data: CartItem[];
      cart_total: number;
      discount_amount?: number;
      shipping_amount?: number;
      tax_amount?: number;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('checkout-session', {
        method: 'POST',
        body: data,
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

      return result.session as CheckoutSession;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(['checkout-session', session.id], { session, addresses: [] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create checkout session',
        variant: 'destructive',
      });
    },
  });

  // Collect phone number mutation (replaces OTP flow)
  const collectPhone = useMutation({
    mutationFn: async (phoneNumber: string) => {
      if (!sessionId) throw new Error('No session');

      // Validate phone format
      if (!/^\+91\d{10}$/.test(phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      // Check if user exists with this phone
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('phone', phoneNumber)
        .maybeSingle();

      // Fetch current user
      const { data: { user } } = await supabase.auth.getUser();

      // Update session - mark phone as collected and move to address step
      const updateData: Record<string, unknown> = {
        phone_number: phoneNumber,
        current_step: 'address',
        user_id: existingUser?.id || user?.id || null,
      };

      const { error: updateError } = await supabase
        .from('checkout_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Log event
      await supabase.from('checkout_events').insert({
        session_id: sessionId,
        event_type: 'phone_collected',
        event_data: { phone_number: phoneNumber.replace(/\d(?=\d{4})/g, '*'), returning_user: !!existingUser },
        step: 'address',
        previous_step: 'login',
      });

      return { user: existingUser };
    },
    onSuccess: () => {
      toast({
        title: 'Phone Number Saved',
        description: 'Continuing to address',
      });
      refetchSession();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save phone',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update address mutation
  const updateAddress = useMutation({
    mutationFn: async (data: {
      address_id?: string;
      full_name: string;
      phone: string;
      address_line1: string;
      address_line2?: string;
      city: string;
      state: string;
      pincode: string;
      save_address?: boolean;
    }) => {
      if (!sessionId) throw new Error('No session');

      // Validate pincode serviceability
      const { data: pincodeData } = await supabase
        .from('pincode_serviceability')
        .select('*')
        .eq('pincode', data.pincode)
        .maybeSingle();

      const isServiceable = pincodeData?.is_serviceable ?? true;
      const codAvailable = pincodeData?.cod_available ?? true;
      const deliveryMin = pincodeData?.delivery_days_min ?? 3;
      const deliveryMax = pincodeData?.delivery_days_max ?? 7;

      if (pincodeData && !isServiceable) {
        throw new Error('Delivery not available to this pincode');
      }

      const shippingAddress = {
        address_line1: data.address_line1,
        address_line2: data.address_line2 || '',
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: 'India',
      };

      const deliveryEstimate = `${deliveryMin}-${deliveryMax} business days`;

      // Update session
      const { error: updateError } = await supabase
        .from('checkout_sessions')
        .update({
          shipping_name: data.full_name,
          shipping_address: JSON.parse(JSON.stringify(shippingAddress)),
          shipping_pincode: data.pincode,
          delivery_estimate: deliveryEstimate,
          cod_available: codAvailable,
          current_step: 'payment' as const,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Save address if requested
      if (data.save_address && session?.user_id) {
        await supabase.from('customer_addresses').insert({
          user_id: session.user_id,
          label: 'Home',
          full_name: data.full_name,
          phone: data.phone,
          ...shippingAddress,
        });
      }

      // Log event
      await supabase.from('checkout_events').insert({
        session_id: sessionId,
        event_type: 'address_updated',
        event_data: { pincode: data.pincode, cod_available: codAvailable },
        step: 'payment',
        previous_step: 'address',
      });

      return { delivery_estimate: deliveryEstimate, cod_available: codAvailable };
    },
    onSuccess: () => {
      toast({
        title: 'Address Updated',
        description: 'Delivery address saved successfully',
      });
      refetchSession();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Select payment method mutation
  const selectPaymentMethod = useMutation({
    mutationFn: async (paymentMethod: PaymentMethod) => {
      if (!sessionId) throw new Error('No session');

      if (paymentMethod === 'cod' && !session?.cod_available) {
        throw new Error('COD is not available for this location');
      }

      const { error: updateError } = await supabase
        .from('checkout_sessions')
        .update({
          selected_payment_method: paymentMethod,
          cod_verification_required: paymentMethod === 'cod',
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Log event
      await supabase.from('checkout_events').insert({
        session_id: sessionId,
        event_type: 'payment_method_selected',
        event_data: { payment_method: paymentMethod },
        step: 'payment',
      });

      return { requires_verification: paymentMethod === 'cod' };
    },
    onSuccess: () => {
      refetchSession();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Complete checkout mutation
  const completeCheckout = useMutation({
    mutationFn: async (data?: { order_id?: string; payment_id?: string }) => {
      if (!sessionId || !session) throw new Error('No session');

      // Phone must be collected (no OTP verification required)
      if (!session.phone_number) {
        throw new Error('Phone number required');
      }

      if (!session.shipping_address) {
        throw new Error('Shipping address required');
      }

      if (!session.selected_payment_method) {
        throw new Error('Payment method required');
      }

      // For online payments, create order in 'pending' status (to avoid draft audit logging issue)
      // For COD, create order in 'in_progress' status
      // The order status will be updated to 'in_progress' after successful payment verification
      const orderStatus = session.selected_payment_method === 'cod' ? 'in_progress' : 'pending';

      // Create order - for payment link flows, user_id should already be set
      // by the resolve-payment-link-user edge function called during phone collection.
      // For authenticated users, we use their auth id.
      const currentUser = (await supabase.auth.getUser()).data.user;
      let effectiveCustomerId = session.user_id || currentUser?.id;
      
      // If still no user_id and this is a payment link flow with phone collected,
      // call the user resolution endpoint to create/associate the user
      if (!effectiveCustomerId && session.phone_number && session.payment_link_id) {
        try {
          const { data: resolveData, error: resolveError } = await supabase.functions.invoke(
            'resolve-payment-link-user',
            {
              body: {
                checkout_session_id: sessionId,
                phone_number: session.phone_number,
                payment_link_id: session.payment_link_id,
              },
            }
          );
          
          if (resolveError) {
            console.error('User resolution failed:', resolveError);
          } else if (resolveData?.user_id) {
            effectiveCustomerId = resolveData.user_id;
            // Refetch session to get updated user_id
            await refetchSession();
          }
        } catch (err) {
          console.error('Failed to resolve user:', err);
        }
      }
      
      // Final check - if we still don't have a customer ID, we can't proceed
      if (!effectiveCustomerId) {
        throw new Error('Unable to process checkout. Please try again or contact support.');
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: effectiveCustomerId,
          merchant_id: session.merchant_id,
          merchant_name: session.merchants?.business_name || 'Merchant',
          product_name: session.cart_data?.[0]?.product_name || 'Order',
          product_description: session.cart_data?.map(i => `${i.product_name} x${i.quantity}`).join(', '),
          amount: session.final_amount,
          status: orderStatus,
          // Include phone_snapshot for audit trail
          phone_snapshot: session.phone_number || session.phone_snapshot,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update session
      const { error: updateError } = await supabase
        .from('checkout_sessions')
        .update({
          status: session.selected_payment_method === 'cod' ? 'completed' : 'active',
          current_step: session.selected_payment_method === 'cod' ? 'confirmation' : 'payment',
          order_id: order.id,
          completed_at: session.selected_payment_method === 'cod' ? new Date().toISOString() : null,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Log event
      await supabase.from('checkout_events').insert({
        session_id: sessionId,
        event_type: session.selected_payment_method === 'cod' ? 'checkout_completed' : 'order_created',
        event_data: { order_id: order.id, payment_method: session.selected_payment_method },
        step: session.selected_payment_method === 'cod' ? 'confirmation' : 'payment',
        previous_step: 'payment',
      });

      return { order_id: order.id };
    },
    onSuccess: (data) => {
      toast({
        title: 'Order Placed',
        description: 'Your order has been placed successfully',
      });
      refetchSession();
    },
    onError: (error: Error) => {
      toast({
        title: 'Checkout Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Navigate to step
  const goToStep = useCallback(async (step: CheckoutStep) => {
    if (!sessionId) return;

    // Validate step transitions
    const stepOrder: CheckoutStep[] = ['login', 'address', 'payment', 'confirmation'];
    const currentIndex = stepOrder.indexOf(session?.current_step || 'login');
    const targetIndex = stepOrder.indexOf(step);

    // Can only go back or stay at current step
    if (targetIndex > currentIndex && session?.status === 'active') {
      return;
    }

    await supabase
      .from('checkout_sessions')
      .update({ current_step: step })
      .eq('id', sessionId);

    refetchSession();
  }, [sessionId, session, refetchSession]);

  // Check if session is expired
  const isExpired = session?.status === 'expired' || 
    (session?.expires_at && new Date(session.expires_at) < new Date());

  // Calculate time remaining
  const getTimeRemaining = useCallback(() => {
    if (!session?.expires_at) return null;
    const remaining = new Date(session.expires_at).getTime() - Date.now();
    if (remaining <= 0) return 0;
    return Math.floor(remaining / 1000);
  }, [session?.expires_at]);

  return {
    session: session ? { ...session, phone_collected: !!session.phone_number } : session,
    addresses,
    isLoading: isLoadingSession,
    isProcessing,
    error: sessionError,
    isExpired,
    getTimeRemaining,
    
    // Mutations
    createSession,
    collectPhone,
    updateAddress,
    selectPaymentMethod,
    completeCheckout,
    
    // Navigation
    goToStep,
    refetchSession,
  };
}