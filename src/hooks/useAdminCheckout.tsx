import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CheckoutSession {
  id: string;
  merchant_id: string;
  user_id: string | null;
  status: 'active' | 'completed' | 'expired' | 'abandoned' | 'failed';
  current_step: 'login' | 'address' | 'payment' | 'confirmation';
  cart_total: number;
  final_amount: number;
  shipping_amount: number;
  discount_amount: number;
  tax_amount: number;
  selected_payment_method: string | null;
  phone_number: string | null;
  email: string | null;
  shipping_name: string | null;
  shipping_address: Record<string, unknown> | null;
  shipping_pincode: string | null;
  payment_attempts: number;
  otp_attempts: number;
  otp_verified: boolean;
  is_guest: boolean;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  last_payment_error: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  completed_at: string | null;
  merchant?: {
    id: string;
    business_name: string;
  };
}

export interface CheckoutEvent {
  id: string;
  session_id: string;
  event_type: string;
  step: string | null;
  previous_step: string | null;
  event_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
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
  metadata: Record<string, unknown> | null;
}

export interface CheckoutRiskFlag {
  id: string;
  session_id: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  auto_blocked: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  resolution: string | null;
  created_at: string;
}

export interface AdminCheckoutNote {
  id: string;
  session_id: string;
  admin_id: string;
  note: string;
  created_at: string;
}

export interface CheckoutMetrics {
  totalSessions: number;
  completedPayments: number;
  conversionRate: number;
  failureRate: number;
  avgCheckoutDuration: number;
  sessionsToday: number;
  sessionsChange: number;
  completedChange: number;
  conversionChange: number;
  failureChange: number;
}

export interface GatewayHealth {
  gateway: string;
  successRate: number;
  failureRate: number;
  timeoutRate: number;
  avgLatency: number;
  totalAttempts: number;
  isDegraded: boolean;
}

export interface SystemAlert {
  id: string;
  type: 'failure_spike' | 'gateway_outage' | 'abnormal_retry' | 'suspicious_pattern';
  severity: 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  sessionIds: string[];
  createdAt: string;
  acknowledged: boolean;
}

export interface SessionFilters {
  dateRange?: { from: Date; to: Date };
  merchantId?: string;
  status?: string[];
  failureStage?: string;
  paymentMethod?: string;
  gateway?: string;
  riskFlagged?: boolean;
  search?: string;
}

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: number | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  }) as T;
}

export function useAdminCheckout() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [metrics, setMetrics] = useState<CheckoutMetrics>({
    totalSessions: 0,
    completedPayments: 0,
    conversionRate: 0,
    failureRate: 0,
    avgCheckoutDuration: 0,
    sessionsToday: 0,
    sessionsChange: 0,
    completedChange: 0,
    conversionChange: 0,
    failureChange: 0,
  });
  const [gatewayHealth, setGatewayHealth] = useState<GatewayHealth[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Refs for subscription management and preventing concurrent fetches
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isFetchingMetricsRef = useRef(false);
  const isFetchingSessionsRef = useRef(false);
  const lastFiltersRef = useRef<string>('');

  // Fetch platform-wide metrics with proper error handling and concurrency control
  const fetchMetrics = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingMetricsRef.current) {
      console.log('[AdminCheckout] Skipping metrics fetch - already in progress');
      return;
    }
    
    isFetchingMetricsRef.current = true;
    
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const yesterdayEnd = todayStart;

      // Batch queries for efficiency
      const [
        todayResult,
        yesterdayResult,
        totalResult,
        completedResult,
        todayCompletedResult,
        yesterdayCompletedResult,
        failedResult,
        durationResult
      ] = await Promise.all([
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStart).lt('created_at', yesterdayEnd),
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', todayStart),
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', yesterdayStart).lt('created_at', yesterdayEnd),
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
        supabase.from('checkout_sessions').select('created_at, completed_at').eq('status', 'completed').not('completed_at', 'is', null).limit(100)
      ]);

      const todaySessions = todayResult.count || 0;
      const yesterdaySessions = yesterdayResult.count || 0;
      const total = totalResult.count || 0;
      const completed = completedResult.count || 0;
      const todayCompleted = todayCompletedResult.count || 0;
      const yesterdayCompleted = yesterdayCompletedResult.count || 0;
      const failed = failedResult.count || 0;

      const conversionRate = total > 0 ? (completed / total) * 100 : 0;
      const failureRate = total > 0 ? (failed / total) * 100 : 0;

      // Calculate changes with zero-division protection
      const sessionsChange = yesterdaySessions > 0
        ? ((todaySessions - yesterdaySessions) / yesterdaySessions) * 100
        : 0;
      const completedChange = yesterdayCompleted > 0
        ? ((todayCompleted - yesterdayCompleted) / yesterdayCompleted) * 100
        : 0;

      // Avg checkout duration with sanity checks
      let avgDuration = 0;
      const durationData = durationResult.data || [];
      if (durationData.length > 0) {
        let validCount = 0;
        const totalDuration = durationData.reduce((acc, s) => {
          if (s.completed_at) {
            const duration = new Date(s.completed_at).getTime() - new Date(s.created_at).getTime();
            // Sanity check: ignore invalid durations (negative or > 1 hour)
            if (duration > 0 && duration < 3600000) {
              validCount++;
              return acc + duration;
            }
          }
          return acc;
        }, 0);
        
        if (validCount > 0) {
          avgDuration = totalDuration / validCount / 1000 / 60; // minutes
        }
      }

      setMetrics({
        totalSessions: total,
        completedPayments: completed,
        conversionRate,
        failureRate,
        avgCheckoutDuration: avgDuration,
        sessionsToday: todaySessions,
        sessionsChange,
        completedChange,
        conversionChange: 0,
        failureChange: 0,
      });
    } catch (error) {
      console.error('[AdminCheckout] Error fetching metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch checkout metrics',
        variant: 'destructive',
      });
    } finally {
      isFetchingMetricsRef.current = false;
    }
  }, [toast]);

  // Fetch gateway health with proper error handling
  const fetchGatewayHealth = useCallback(async () => {
    try {
      const { data: attempts, error } = await supabase
        .from('checkout_attempts')
        .select('gateway, status, initiated_at, completed_at')
        .gte('initiated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('[AdminCheckout] Error fetching gateway health:', error);
        return;
      }

      if (!attempts || attempts.length === 0) {
        setGatewayHealth([]);
        return;
      }

      const gatewayStats: Record<string, { total: number; success: number; failed: number; timeout: number; latencies: number[] }> = {};

      for (const attempt of attempts) {
        const gateway = attempt.gateway || 'unknown';
        if (!gatewayStats[gateway]) {
          gatewayStats[gateway] = { total: 0, success: 0, failed: 0, timeout: 0, latencies: [] };
        }
        gatewayStats[gateway].total++;
        
        if (attempt.status === 'success') {
          gatewayStats[gateway].success++;
          if (attempt.completed_at && attempt.initiated_at) {
            const latency = new Date(attempt.completed_at).getTime() - new Date(attempt.initiated_at).getTime();
            // Sanity check latency
            if (latency > 0 && latency < 120000) { // < 2 minutes
              gatewayStats[gateway].latencies.push(latency);
            }
          }
        } else if (attempt.status === 'failed') {
          gatewayStats[gateway].failed++;
        } else if (attempt.status === 'timeout') {
          gatewayStats[gateway].timeout++;
        }
      }

      const health: GatewayHealth[] = Object.entries(gatewayStats).map(([gateway, stats]) => ({
        gateway,
        successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
        failureRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0,
        timeoutRate: stats.total > 0 ? (stats.timeout / stats.total) * 100 : 0,
        avgLatency: stats.latencies.length > 0
          ? stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length / 1000
          : 0,
        totalAttempts: stats.total,
        isDegraded: stats.total > 5 && ((stats.failed / stats.total) > 0.1 || (stats.timeout / stats.total) > 0.05),
      }));

      setGatewayHealth(health);
    } catch (error) {
      console.error('[AdminCheckout] Error fetching gateway health:', error);
    }
  }, []);

  // Generate system alerts based on real data
  const generateSystemAlerts = useCallback(async () => {
    try {
      const alerts: SystemAlert[] = [];
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Batch queries
      const [recentFailuresResult, totalRecentResult, highRetryResult, riskFlaggedResult] = await Promise.all([
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', oneHourAgo),
        supabase.from('checkout_sessions').select('*', { count: 'exact', head: true }).gte('created_at', oneHourAgo),
        supabase.from('checkout_sessions').select('id, payment_attempts').gte('created_at', oneHourAgo).gt('payment_attempts', 5),
        supabase.from('checkout_risk_flags').select('*', { count: 'exact', head: true }).eq('severity', 'critical').is('reviewed_at', null)
      ]);

      const recentFailures = recentFailuresResult.count || 0;
      const totalRecent = totalRecentResult.count || 0;
      const highRetry = highRetryResult.data || [];
      const riskFlagged = riskFlaggedResult.count || 0;

      // Failure spike alert
      if (totalRecent > 10 && recentFailures > 0 && (recentFailures / totalRecent) > 0.3) {
        alerts.push({
          id: `failure-spike-${Date.now()}`,
          type: 'failure_spike',
          severity: 'error',
          title: 'Elevated Payment Failure Rate',
          description: `${((recentFailures / totalRecent) * 100).toFixed(1)}% failure rate in the last hour (${recentFailures} failures)`,
          sessionIds: [],
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }

      // Abnormal retry alert
      if (highRetry.length > 3) {
        alerts.push({
          id: `abnormal-retry-${Date.now()}`,
          type: 'abnormal_retry',
          severity: 'warning',
          title: 'Abnormal Retry Behavior Detected',
          description: `${highRetry.length} sessions with excessive payment attempts`,
          sessionIds: highRetry.map(s => s.id),
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }

      // Critical risk flags alert
      if (riskFlagged > 0) {
        alerts.push({
          id: `suspicious-pattern-${Date.now()}`,
          type: 'suspicious_pattern',
          severity: 'critical',
          title: 'Critical Risk Flags Pending Review',
          description: `${riskFlagged} sessions flagged for suspicious activity`,
          sessionIds: [],
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }

      setSystemAlerts(alerts);
    } catch (error) {
      console.error('[AdminCheckout] Error generating alerts:', error);
    }
  }, []);

  // Fetch sessions with filters and concurrency control
  const fetchSessions = useCallback(async (filters?: SessionFilters, page = 1, pageSize = 20) => {
    // Create a hash of current filters to detect changes
    const filterHash = JSON.stringify({ filters, page, pageSize });
    
    // Prevent concurrent fetches with same filters
    if (isFetchingSessionsRef.current && lastFiltersRef.current === filterHash) {
      console.log('[AdminCheckout] Skipping sessions fetch - identical request in progress');
      return;
    }
    
    isFetchingSessionsRef.current = true;
    lastFiltersRef.current = filterHash;
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('checkout_sessions')
        .select(`
          *,
          merchant:merchants(id, business_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Apply filters safely
      if (filters?.dateRange?.from) {
        query = query.gte('created_at', filters.dateRange.from.toISOString());
      }
      if (filters?.dateRange?.to) {
        query = query.lte('created_at', filters.dateRange.to.toISOString());
      }
      if (filters?.merchantId) {
        query = query.eq('merchant_id', filters.merchantId);
      }
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status as ('active' | 'completed' | 'expired' | 'abandoned' | 'failed')[]);
      }
      if (filters?.failureStage) {
        query = query.eq('current_step', filters.failureStage as 'login' | 'address' | 'payment' | 'confirmation');
      }
      if (filters?.paymentMethod) {
        query = query.eq('selected_payment_method', filters.paymentMethod as 'upi' | 'card' | 'wallet' | 'emi' | 'cod' | 'netbanking');
      }
      if (filters?.search) {
        // Sanitize search input
        const sanitizedSearch = filters.search.replace(/[%_\\]/g, '');
        query = query.or(`id.ilike.%${sanitizedSearch}%,phone_number.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`);
      }

      const { data, count, error } = await query;

      if (error) {
        throw error;
      }

      setSessions((data as unknown as CheckoutSession[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('[AdminCheckout] Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch checkout sessions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      isFetchingSessionsRef.current = false;
    }
  }, [toast]);

  // Fetch single session details
  const fetchSessionDetails = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      console.error('[AdminCheckout] fetchSessionDetails called without sessionId');
      return null;
    }

    try {
      // Batch all queries
      const [sessionResult, eventsResult, attemptsResult, riskFlagsResult] = await Promise.all([
        supabase.from('checkout_sessions').select(`*, merchant:merchants(id, business_name, email)`).eq('id', sessionId).single(),
        supabase.from('checkout_events').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
        supabase.from('checkout_attempts').select('*').eq('session_id', sessionId).order('initiated_at', { ascending: true }),
        supabase.from('checkout_risk_flags').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
      ]);

      if (sessionResult.error) {
        throw sessionResult.error;
      }

      const session = sessionResult.data;

      // Fetch linked order if exists
      let order = null;
      if (session?.order_id) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', session.order_id)
          .single();
        order = orderData;
      }

      return {
        session: session as unknown as CheckoutSession,
        events: (eventsResult.data as unknown as CheckoutEvent[]) || [],
        attempts: (attemptsResult.data as unknown as CheckoutAttempt[]) || [],
        riskFlags: (riskFlagsResult.data as unknown as CheckoutRiskFlag[]) || [],
        order,
      };
    } catch (error) {
      console.error('[AdminCheckout] Error fetching session details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch session details',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Add admin note to session with validation
  const addSessionNote = useCallback(async (sessionId: string, note: string): Promise<boolean> => {
    if (!sessionId || !note?.trim()) {
      toast({
        title: 'Error',
        description: 'Session ID and note are required',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to add notes',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('checkout_risk_flags')
        .insert([{
          session_id: sessionId,
          flag_type: 'admin_note',
          severity: 'low',
          description: note.trim().slice(0, 1000), // Limit note length
          auto_blocked: false,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        }]);

      if (error) throw error;

      toast({
        title: 'Note Added',
        description: 'Your note has been saved',
      });
      return true;
    } catch (error: unknown) {
      console.error('[AdminCheckout] Error adding note:', error);
      toast({
        title: 'Error',
        description: (error as Error)?.message || 'Failed to add note',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Flag session for review with validation
  const flagSession = useCallback(async (sessionId: string, reason: string): Promise<boolean> => {
    if (!sessionId || !reason?.trim()) {
      toast({
        title: 'Error',
        description: 'Session ID and reason are required',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to flag sessions',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('checkout_risk_flags')
        .insert([{
          session_id: sessionId,
          flag_type: 'admin_flagged',
          severity: 'medium',
          description: reason.trim().slice(0, 1000), // Limit reason length
          auto_blocked: false,
        }]);

      if (error) throw error;

      toast({
        title: 'Session Flagged',
        description: 'Session has been flagged for review',
      });
      return true;
    } catch (error: unknown) {
      console.error('[AdminCheckout] Error flagging session:', error);
      toast({
        title: 'Error',
        description: (error as Error)?.message || 'Failed to flag session',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Fetch session notes
  const fetchSessionNotes = useCallback(async (sessionId: string): Promise<AdminCheckoutNote[]> => {
    if (!sessionId) return [];

    try {
      const { data, error } = await supabase
        .from('checkout_risk_flags')
        .select('*')
        .eq('session_id', sessionId)
        .eq('flag_type', 'admin_note')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((flag: Record<string, unknown>) => ({
        id: flag.id as string,
        session_id: flag.session_id as string,
        admin_id: (flag.reviewed_by as string) || '',
        note: (flag.description as string) || '',
        created_at: flag.created_at as string,
      }));
    } catch (error) {
      console.error('[AdminCheckout] Error fetching notes:', error);
      return [];
    }
  }, []);

  // Debounced refetch function for realtime updates
  const debouncedRefetch = useCallback(
    debounce(() => {
      console.log('[AdminCheckout] Debounced refetch triggered');
      fetchMetrics();
      fetchSessions();
    }, 1000),
    [fetchMetrics, fetchSessions]
  );

  // Setup realtime subscriptions with proper cleanup and debouncing
  useEffect(() => {
    // Cleanup previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel('admin-checkout-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
        },
        () => {
          debouncedRefetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_attempts',
        },
        () => {
          // Only refetch gateway health for attempt changes
          fetchGatewayHealth();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkout_risk_flags',
        },
        () => {
          generateSystemAlerts();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[AdminCheckout] Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[AdminCheckout] Realtime subscription error');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [fetchGatewayHealth, generateSystemAlerts, debouncedRefetch]);

  // Initial data fetch
  useEffect(() => {
    const initFetch = async () => {
      await Promise.all([
        fetchMetrics(),
        fetchGatewayHealth(),
        generateSystemAlerts(),
        fetchSessions()
      ]);
    };
    initFetch();
  }, [fetchMetrics, fetchGatewayHealth, generateSystemAlerts, fetchSessions]);

  return {
    isLoading,
    sessions,
    metrics,
    gatewayHealth,
    systemAlerts,
    totalCount,
    fetchSessions,
    fetchSessionDetails,
    addSessionNote,
    flagSession,
    fetchSessionNotes,
    refetch: () => {
      fetchMetrics();
      fetchGatewayHealth();
      generateSystemAlerts();
      fetchSessions();
    },
  };
}
