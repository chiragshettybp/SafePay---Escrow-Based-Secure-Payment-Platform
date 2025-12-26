import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

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

export function useMerchantCheckout({ merchantId, dateRange }: UseMerchantCheckoutOptions = {}) {
  const [realtimeSession, setRealtimeSession] = useState<CheckoutSession | null>(null);

  // Fetch checkout sessions
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['merchant-checkout-sessions', merchantId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('checkout_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (merchantId) {
        query = query.eq('merchant_id', merchantId);
      }

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as CheckoutSession[];
    },
    enabled: !!merchantId,
  });

  // Fetch checkout events for analytics
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['merchant-checkout-events', merchantId, dateRange],
    queryFn: async () => {
      const sessionIds = sessions?.map(s => s.id) || [];
      if (sessionIds.length === 0) return [];

      const { data, error } = await supabase
        .from('checkout_events')
        .select('*')
        .in('session_id', sessionIds.slice(0, 100))
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CheckoutEvent[];
    },
    enabled: !!sessions && sessions.length > 0,
  });

  // Calculate metrics
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

  // Real-time subscription
  useEffect(() => {
    if (!merchantId) return;

    const channel = supabase
      .channel('merchant-checkout-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          if (payload.new) {
            setRealtimeSession(payload.new as CheckoutSession);
            refetchSessions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchantId, refetchSessions]);

  return {
    sessions,
    events,
    metrics,
    funnel,
    alerts,
    isLoading: sessionsLoading || eventsLoading,
    refetch: refetchSessions,
    realtimeSession,
  };
}

function calculateAvgCheckoutTime(sessions: CheckoutSession[]): number {
  const completedSessions = sessions.filter(s => s.status === 'completed' && s.completed_at);
  if (completedSessions.length === 0) return 0;

  const totalTime = completedSessions.reduce((acc, session) => {
    const start = new Date(session.created_at).getTime();
    const end = new Date(session.completed_at!).getTime();
    return acc + (end - start);
  }, 0);

  return Math.round(totalTime / completedSessions.length / 1000); // in seconds
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
  if (metrics.paymentFailureRate > 20) {
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
  if (expiredCount > sessions.length * 0.3) {
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
  if (metrics.codCount > metrics.prepaidCount * 2 && metrics.codCount > 5) {
    alerts.push({
      id: 'cod-heavy',
      type: 'info',
      title: 'COD Dominant',
      description: `${Math.round((metrics.codCount / (metrics.codCount + metrics.prepaidCount)) * 100)}% of orders are COD.`,
      action: 'View COD Sessions',
      filter: { payment_method: 'cod' },
    });
  }

  return alerts;
}

// Hook for single session details
export function useMerchantCheckoutSession(sessionId: string | undefined) {
  const { data: session, isLoading: sessionLoading, refetch } = useQuery({
    queryKey: ['checkout-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const { data, error } = await supabase
        .from('checkout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data as CheckoutSession;
    },
    enabled: !!sessionId,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['checkout-session-events', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('checkout_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CheckoutEvent[];
    },
    enabled: !!sessionId,
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['checkout-session-attempts', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('checkout_attempts')
        .select('*')
        .eq('session_id', sessionId)
        .order('initiated_at', { ascending: false });

      if (error) throw error;
      return data as CheckoutAttempt[];
    },
    enabled: !!sessionId,
  });

  const { data: riskFlags } = useQuery({
    queryKey: ['checkout-session-risks', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('checkout_risk_flags')
        .select('*')
        .eq('session_id', sessionId);

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Real-time updates for this session
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, refetch]);

  return {
    session,
    events,
    attempts,
    riskFlags,
    isLoading: sessionLoading || eventsLoading || attemptsLoading,
    refetch,
  };
}
