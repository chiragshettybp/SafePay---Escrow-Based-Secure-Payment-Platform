import { useState, useEffect, useCallback } from 'react';
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

  // Fetch platform-wide metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const yesterdayEnd = todayStart;

      // Today's sessions
      const { count: todaySessions } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart);

      // Yesterday's sessions for comparison
      const { count: yesterdaySessions } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterdayStart)
        .lt('created_at', yesterdayEnd);

      // Total sessions
      const { count: totalSessions } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true });

      // Completed sessions
      const { count: completedSessions } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Today's completed
      const { count: todayCompleted } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', todayStart);

      // Yesterday's completed
      const { count: yesterdayCompleted } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', yesterdayStart)
        .lt('created_at', yesterdayEnd);

      // Failed sessions
      const { count: failedSessions } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      // Calculate metrics
      const total = totalSessions || 0;
      const completed = completedSessions || 0;
      const failed = failedSessions || 0;
      const conversionRate = total > 0 ? (completed / total) * 100 : 0;
      const failureRate = total > 0 ? (failed / total) * 100 : 0;

      // Calculate changes
      const sessionsChange = yesterdaySessions && yesterdaySessions > 0
        ? (((todaySessions || 0) - yesterdaySessions) / yesterdaySessions) * 100
        : 0;
      const completedChange = yesterdayCompleted && yesterdayCompleted > 0
        ? (((todayCompleted || 0) - yesterdayCompleted) / yesterdayCompleted) * 100
        : 0;

      // Avg checkout duration (from completed sessions)
      const { data: durationData } = await supabase
        .from('checkout_sessions')
        .select('created_at, completed_at')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .limit(100);

      let avgDuration = 0;
      if (durationData && durationData.length > 0) {
        const totalDuration = durationData.reduce((acc, s) => {
          if (s.completed_at) {
            return acc + (new Date(s.completed_at).getTime() - new Date(s.created_at).getTime());
          }
          return acc;
        }, 0);
        avgDuration = totalDuration / durationData.length / 1000 / 60; // minutes
      }

      setMetrics({
        totalSessions: total,
        completedPayments: completed,
        conversionRate,
        failureRate,
        avgCheckoutDuration: avgDuration,
        sessionsToday: todaySessions || 0,
        sessionsChange,
        completedChange,
        conversionChange: 0,
        failureChange: 0,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, []);

  // Fetch gateway health
  const fetchGatewayHealth = useCallback(async () => {
    try {
      const { data: attempts } = await supabase
        .from('checkout_attempts')
        .select('gateway, status, initiated_at, completed_at')
        .gte('initiated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!attempts) return;

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
            gatewayStats[gateway].latencies.push(latency);
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
        isDegraded: (stats.failed / stats.total) > 0.1 || (stats.timeout / stats.total) > 0.05,
      }));

      setGatewayHealth(health);
    } catch (error) {
      console.error('Error fetching gateway health:', error);
    }
  }, []);

  // Generate system alerts based on real data
  const generateSystemAlerts = useCallback(async () => {
    try {
      const alerts: SystemAlert[] = [];
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Check for failure spike
      const { count: recentFailures } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', oneHourAgo);

      const { count: totalRecent } = await supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);

      if (totalRecent && totalRecent > 10 && recentFailures && (recentFailures / totalRecent) > 0.3) {
        alerts.push({
          id: 'failure-spike-' + Date.now(),
          type: 'failure_spike',
          severity: 'error',
          title: 'Elevated Payment Failure Rate',
          description: `${((recentFailures / totalRecent) * 100).toFixed(1)}% failure rate in the last hour (${recentFailures} failures)`,
          sessionIds: [],
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }

      // Check for suspicious retry patterns
      const { data: highRetry } = await supabase
        .from('checkout_sessions')
        .select('id, payment_attempts')
        .gte('created_at', oneHourAgo)
        .gt('payment_attempts', 5);

      if (highRetry && highRetry.length > 3) {
        alerts.push({
          id: 'abnormal-retry-' + Date.now(),
          type: 'abnormal_retry',
          severity: 'warning',
          title: 'Abnormal Retry Behavior Detected',
          description: `${highRetry.length} sessions with excessive payment attempts`,
          sessionIds: highRetry.map(s => s.id),
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }

      // Check for risk-flagged sessions
      const { count: riskFlagged } = await supabase
        .from('checkout_risk_flags')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .is('reviewed_at', null);

      if (riskFlagged && riskFlagged > 0) {
        alerts.push({
          id: 'suspicious-pattern-' + Date.now(),
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
      console.error('Error generating alerts:', error);
    }
  }, []);

  // Fetch sessions with filters
  const fetchSessions = useCallback(async (filters?: SessionFilters, page = 1, pageSize = 20) => {
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

      // Apply filters
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
        query = query.in('status', filters.status as any);
      }
      if (filters?.failureStage) {
        query = query.eq('current_step', filters.failureStage as any);
      }
      if (filters?.paymentMethod) {
        query = query.eq('selected_payment_method', filters.paymentMethod as any);
      }
      if (filters?.search) {
        query = query.or(`id.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setSessions((data as unknown as CheckoutSession[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch checkout sessions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch single session details
  const fetchSessionDetails = useCallback(async (sessionId: string) => {
    try {
      const { data: session, error: sessionError } = await supabase
        .from('checkout_sessions')
        .select(`
          *,
          merchant:merchants(id, business_name, email)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Fetch events
      const { data: events } = await supabase
        .from('checkout_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      // Fetch attempts
      const { data: attempts } = await supabase
        .from('checkout_attempts')
        .select('*')
        .eq('session_id', sessionId)
        .order('initiated_at', { ascending: true });

      // Fetch risk flags
      const { data: riskFlags } = await supabase
        .from('checkout_risk_flags')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

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
        events: (events as unknown as CheckoutEvent[]) || [],
        attempts: (attempts as unknown as CheckoutAttempt[]) || [],
        riskFlags: (riskFlags as unknown as CheckoutRiskFlag[]) || [],
        order,
      };
    } catch (error) {
      console.error('Error fetching session details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch session details',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Add admin note to session (stored as risk flag with admin_note type)
  const addSessionNote = useCallback(async (sessionId: string, note: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('checkout_risk_flags')
        .insert({
          session_id: sessionId,
          flag_type: 'admin_note',
          severity: 'low',
          description: note,
          auto_blocked: false,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        } as any);

      if (error) throw error;

      toast({
        title: 'Note Added',
        description: 'Your note has been saved',
      });
      return true;
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add note',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Flag session for review
  const flagSession = useCallback(async (sessionId: string, reason: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('checkout_risk_flags')
        .insert({
          session_id: sessionId,
          flag_type: 'admin_flagged',
          severity: 'medium',
          description: reason,
          auto_blocked: false,
        } as any);

      if (error) throw error;

      toast({
        title: 'Session Flagged',
        description: 'Session has been flagged for review',
      });
      return true;
    } catch (error: any) {
      console.error('Error flagging session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to flag session',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Fetch session notes (from risk flags with admin_note type)
  const fetchSessionNotes = useCallback(async (sessionId: string): Promise<AdminCheckoutNote[]> => {
    try {
      const { data, error } = await supabase
        .from('checkout_risk_flags')
        .select('*')
        .eq('session_id', sessionId)
        .eq('flag_type', 'admin_note')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map risk flags to notes format
      return (data || []).map((flag: any) => ({
        id: flag.id,
        session_id: flag.session_id,
        admin_id: flag.reviewed_by || '',
        note: flag.description || '',
        created_at: flag.created_at,
      }));
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin-checkout')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
        },
        () => {
          fetchMetrics();
          fetchSessions();
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics, fetchSessions, fetchGatewayHealth, generateSystemAlerts]);

  // Initial data fetch
  useEffect(() => {
    fetchMetrics();
    fetchGatewayHealth();
    generateSystemAlerts();
    fetchSessions();
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