import { useQuery, useQueryClient } from '@tanstack/react-query';
import { merchantSupabase } from '@/integrations/supabase/merchantClient';
import { useEffect, useRef, useCallback } from 'react';

export interface CheckoutMetrics {
  totalSessions: number;
  completedSessions: number;
  conversionRate: number;
  paymentFailureRate: number;
  codCount: number;
  prepaidCount: number;
  avgCheckoutTime: number;
}

export interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  step: string;
}

export interface CheckoutAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  action?: string;
  filter?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  status: string;
  current_step: string;
  phone_number: string | null;
  email: string | null;
  final_amount: number;
  cart_total: number;
  selected_payment_method: string | null;
  payment_attempts: number;
  otp_attempts: number;
  last_payment_error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string;
  is_guest: boolean;
  cod_available: boolean;
  shipping_pincode: string | null;
  device_fingerprint: string | null;
  ip_address: string | null;
  user_agent: string | null;
  order_id: string | null;
}

export interface CheckoutEvent {
  id: string;
  session_id: string;
  event_type: string;
  step: string | null;
  previous_step: string | null;
  event_data: Record<string, unknown>;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface CheckoutAttempt {
  id: string;
  session_id: string;
  payment_method: string;
  amount: number;
  status: string;
  gateway: string | null;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  error_code: string | null;
  error_message: string | null;
  initiated_at: string;
  completed_at: string | null;
}

interface UseMerchantCheckoutOptions {
  merchantId?: string;
  dateRange?: { from: Date; to: Date };
}

// Debounce helper to prevent realtime storms
function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: unknown[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as T;
}

export function useMerchantCheckout({ merchantId, dateRange }: UseMerchantCheckoutOptions = {}) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof merchantSupabase.channel> | null>(null);

  // Fetch checkout sessions with proper error handling and retry
  const { 
    data: sessions, 
    isLoading: sessionsLoading, 
    refetch: refetchSessions,
    error: sessionsError 
  } = useQuery({
    queryKey: ['merchant-checkout-sessions', merchantId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!merchantId) {
        return [];
      }

      let query = merchantSupabase
        .from('checkout_sessions')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query.limit(500);
      
      if (error) {
        console.error('[MerchantCheckout] Failed to fetch sessions:', error);
        throw error;
      }
      
      return (data || []) as CheckoutSession[];
    },
    enabled: !!merchantId,
    staleTime: 30000, // 30 seconds - reduce unnecessary refetches
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Fetch checkout events for analytics
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['merchant-checkout-events', merchantId, sessions?.length],
    queryFn: async () => {
      const sessionIds = sessions?.map(s => s.id) || [];
      if (sessionIds.length === 0) return [];

      // Limit to first 100 sessions to prevent query size issues
      const limitedIds = sessionIds.slice(0, 100);

      const { data, error } = await merchantSupabase
        .from('checkout_events')
        .select('*')
        .in('session_id', limitedIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[MerchantCheckout] Failed to fetch events:', error);
        throw error;
      }
      
      return (data || []) as CheckoutEvent[];
    },
    enabled: !!sessions && sessions.length > 0,
    staleTime: 30000,
    retry: 2,
  });

  // Calculate metrics with null safety
  const metrics: CheckoutMetrics = {
    totalSessions: sessions?.length || 0,
    completedSessions: sessions?.filter(s => s.status === 'completed').length || 0,
    conversionRate: sessions?.length 
      ? Math.round((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100) 
      : 0,
    paymentFailureRate: sessions?.length
      ? Math.round((sessions.filter(s => s.status === 'failed').length / sessions.length) * 100)
      : 0,
    codCount: sessions?.filter(s => s.selected_payment_method === 'cod').length || 0,
    prepaidCount: sessions?.filter(s => s.selected_payment_method && s.selected_payment_method !== 'cod').length || 0,
    avgCheckoutTime: calculateAvgCheckoutTime(sessions || []),
  };

  // Calculate funnel
  const funnel: FunnelStep[] = calculateFunnel(sessions || []);

  // Generate alerts
  const alerts: CheckoutAlert[] = generateAlerts(sessions || [], metrics);

  // Debounced refetch to prevent realtime storms
  const debouncedRefetch = useDebouncedCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['merchant-checkout-sessions', merchantId] });
  }, 1000);

  // Real-time subscription with proper cleanup and debouncing
  useEffect(() => {
    if (!merchantId) return;

    // Cleanup previous subscription if exists
    if (subscriptionRef.current) {
      merchantSupabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = merchantSupabase
      .channel(`merchant-checkout-${merchantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          console.log('[MerchantCheckout] Realtime update:', payload.eventType);
          // Use debounced refetch to prevent storms
          debouncedRefetch();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[MerchantCheckout] Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[MerchantCheckout] Realtime subscription error');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        merchantSupabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [merchantId, debouncedRefetch]);

  return {
    sessions: sessions || [],
    events: events || [],
    metrics,
    funnel,
    alerts,
    isLoading: sessionsLoading || eventsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  };
}

function calculateAvgCheckoutTime(sessions: CheckoutSession[]): number {
  const completedSessions = sessions.filter(s => s.status === 'completed' && s.completed_at);
  if (completedSessions.length === 0) return 0;

  const totalTime = completedSessions.reduce((acc, session) => {
    const start = new Date(session.created_at).getTime();
    const end = new Date(session.completed_at!).getTime();
    const duration = end - start;
    // Sanity check: ignore sessions with invalid duration (negative or > 1 hour)
    if (duration > 0 && duration < 3600000) {
      return acc + duration;
    }
    return acc;
  }, 0);

  const validCount = completedSessions.filter(s => {
    const start = new Date(s.created_at).getTime();
    const end = new Date(s.completed_at!).getTime();
    const duration = end - start;
    return duration > 0 && duration < 3600000;
  }).length;

  if (validCount === 0) return 0;
  return Math.round(totalTime / validCount / 1000); // in seconds
}

function calculateFunnel(sessions: CheckoutSession[]): FunnelStep[] {
  const total = sessions.length;
  if (total === 0) return [];

  const steps = [
    { name: 'Started', step: 'login', count: total },
    { name: 'Logged In', step: 'address', count: sessions.filter(s => ['address', 'payment', 'confirmation'].includes(s.current_step) || s.status === 'completed').length },
    { name: 'Address Added', step: 'payment', count: sessions.filter(s => ['payment', 'confirmation'].includes(s.current_step) || s.status === 'completed').length },
    { name: 'Payment Initiated', step: 'payment_initiated', count: sessions.filter(s => s.payment_attempts > 0).length },
    { name: 'Completed', step: 'confirmation', count: sessions.filter(s => s.status === 'completed').length },
  ];

  return steps.map(step => ({
    ...step,
    percentage: Math.round((step.count / total) * 100),
  }));
}

function generateAlerts(sessions: CheckoutSession[], metrics: CheckoutMetrics): CheckoutAlert[] {
  const alerts: CheckoutAlert[] = [];

  // High payment failure rate
  if (metrics.paymentFailureRate > 20 && metrics.totalSessions > 5) {
    alerts.push({
      id: 'high-failure-rate',
      type: 'error',
      title: 'High Payment Failure Rate',
      description: `${metrics.paymentFailureRate}% of checkouts are failing at payment.`,
      action: 'View Failed Sessions',
      filter: { status: 'failed' },
    });
  }

  // Many expired sessions
  const expiredCount = sessions.filter(s => s.status === 'expired').length;
  if (expiredCount > sessions.length * 0.3 && expiredCount > 3) {
    alerts.push({
      id: 'high-expiry',
      type: 'warning',
      title: 'High Session Expiry',
      description: `${expiredCount} sessions expired without completing.`,
      action: 'View Expired Sessions',
      filter: { status: 'expired' },
    });
  }

  // Low conversion rate
  if (metrics.conversionRate < 10 && metrics.totalSessions > 10) {
    alerts.push({
      id: 'low-conversion',
      type: 'warning',
      title: 'Low Conversion Rate',
      description: `Only ${metrics.conversionRate}% of checkouts are completing.`,
      action: 'Analyze Drop-offs',
      filter: { status: 'abandoned' },
    });
  }

  // COD heavy
  const totalPaymentMethods = metrics.codCount + metrics.prepaidCount;
  if (metrics.codCount > metrics.prepaidCount * 2 && metrics.codCount > 5 && totalPaymentMethods > 0) {
    alerts.push({
      id: 'cod-heavy',
      type: 'info',
      title: 'COD Dominant',
      description: `${Math.round((metrics.codCount / totalPaymentMethods) * 100)}% of orders are COD.`,
      action: 'View COD Sessions',
      filter: { payment_method: 'cod' },
    });
  }

  return alerts;
}

// Hook for single session details with proper error handling
export function useMerchantCheckoutSession(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof merchantSupabase.channel> | null>(null);

  const { data: session, isLoading: sessionLoading, refetch, error: sessionError } = useQuery({
    queryKey: ['checkout-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const { data, error } = await merchantSupabase
        .from('checkout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('[MerchantCheckout] Failed to fetch session:', error);
        throw error;
      }
      return data as CheckoutSession;
    },
    enabled: !!sessionId,
    staleTime: 10000,
    retry: 2,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['checkout-session-events', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await merchantSupabase
        .from('checkout_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[MerchantCheckout] Failed to fetch events:', error);
        throw error;
      }
      return (data || []) as CheckoutEvent[];
    },
    enabled: !!sessionId,
    staleTime: 10000,
    retry: 2,
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['checkout-session-attempts', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await merchantSupabase
        .from('checkout_attempts')
        .select('*')
        .eq('session_id', sessionId)
        .order('initiated_at', { ascending: false });

      if (error) {
        console.error('[MerchantCheckout] Failed to fetch attempts:', error);
        throw error;
      }
      return (data || []) as CheckoutAttempt[];
    },
    enabled: !!sessionId,
    staleTime: 10000,
    retry: 2,
  });

  const { data: riskFlags } = useQuery({
    queryKey: ['checkout-session-risks', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await merchantSupabase
        .from('checkout_risk_flags')
        .select('*')
        .eq('session_id', sessionId);

      if (error) {
        console.error('[MerchantCheckout] Failed to fetch risk flags:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!sessionId,
    staleTime: 10000,
  });

  // Real-time updates for this session with debouncing
  useEffect(() => {
    if (!sessionId) return;

    // Cleanup previous subscription
    if (subscriptionRef.current) {
      merchantSupabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    let debounceTimer: number | null = null;

    const channel = merchantSupabase
      .channel(`session-detail-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          // Debounce refetch
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = window.setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['checkout-session', sessionId] });
          }, 500);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (subscriptionRef.current) {
        merchantSupabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [sessionId, queryClient]);

  return {
    session,
    events: events || [],
    attempts: attempts || [],
    riskFlags: riskFlags || [],
    isLoading: sessionLoading || eventsLoading || attemptsLoading,
    error: sessionError,
    refetch,
  };
}
