import { useQuery } from '@tanstack/react-query';
import { merchantSupabase } from '@/integrations/supabase/merchantClient';
import { useEffect, useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

export interface ReportFilters {
  dateRange: { from: Date; to: Date };
  paymentMethod?: string;
  device?: string;
  browser?: string;
  location?: string;
}

export interface ConversionMetrics {
  totalSessions: number;
  completedSessions: number;
  conversionRate: number;
  paymentFailureRate: number;
  refundRate: number;
  deliveryFailureRate: number;
}

export interface FunnelStepData {
  name: string;
  step: string;
  count: number;
  percentage: number;
  dropOffRate: number;
}

export interface TrendDataPoint {
  date: string;
  conversionRate: number;
  paymentSuccessRate: number;
  sessions: number;
  completed: number;
}

export interface SessionBreakdown {
  date: string;
  sessionsStarted: number;
  paymentsInitiated: number;
  paymentsSuccessful: number;
  conversionPercent: number;
  avgCheckoutTime: number;
}

export interface RTOMetrics {
  totalPaidOrders: number;
  deliveredSuccessfully: number;
  ordersRefunded: number;
  deliveryFailed: number;
  netRevenueLoss: number;
}

export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface LocationFailure {
  location: string;
  totalOrders: number;
  failures: number;
  failureRate: number;
}

interface UseMerchantCheckoutReportsOptions {
  merchantId?: string;
  filters: ReportFilters;
}

export function useMerchantCheckoutReports({ merchantId, filters }: UseMerchantCheckoutReportsOptions) {
  // Fetch checkout sessions with filters
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['merchant-checkout-reports-sessions', merchantId, filters],
    queryFn: async () => {
      let query = merchantSupabase
        .from('checkout_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (merchantId) {
        query = query.eq('merchant_id', merchantId);
      }

      if (filters.dateRange?.from) {
        query = query.gte('created_at', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange?.to) {
        query = query.lte('created_at', filters.dateRange.to.toISOString());
      }

      // Filter by payment method (prepaid only)
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        query = query.eq('selected_payment_method', filters.paymentMethod);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId,
  });

  // Fetch payment attempts
  const { data: paymentAttempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['merchant-checkout-reports-attempts', merchantId, filters],
    queryFn: async () => {
      const sessionIds = sessions?.map(s => s.id) || [];
      if (sessionIds.length === 0) return [];

      const { data, error } = await merchantSupabase
        .from('checkout_attempts')
        .select('*')
        .in('session_id', sessionIds.slice(0, 200));

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessions && sessions.length > 0,
  });

  // Fetch orders for RTO analysis
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['merchant-checkout-reports-orders', merchantId, filters],
    queryFn: async () => {
      let query = merchantSupabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (merchantId) {
        query = query.eq('merchant_id', merchantId);
      }

      if (filters.dateRange?.from) {
        query = query.gte('created_at', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange?.to) {
        query = query.lte('created_at', filters.dateRange.to.toISOString());
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId,
  });

  // Calculate conversion metrics
  const conversionMetrics: ConversionMetrics = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        conversionRate: 0,
        paymentFailureRate: 0,
        refundRate: 0,
        deliveryFailureRate: 0,
      };
    }

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const failed = sessions.filter(s => s.status === 'failed').length;
    
    // Calculate refund and delivery failure rates from orders
    const totalOrders = orders?.length || 0;
    const refundedOrders = orders?.filter(o => o.status === 'refunded').length || 0;
    const failedDeliveries = orders?.filter(o => 
      o.status === 'delivery_failed' || o.status === 'returned'
    ).length || 0;

    return {
      totalSessions: total,
      completedSessions: completed,
      conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      paymentFailureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      refundRate: totalOrders > 0 ? Math.round((refundedOrders / totalOrders) * 100) : 0,
      deliveryFailureRate: totalOrders > 0 ? Math.round((failedDeliveries / totalOrders) * 100) : 0,
    };
  }, [sessions, orders]);

  // Calculate funnel data
  const funnelData: FunnelStepData[] = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const total = sessions.length;
    const steps = [
      { 
        name: 'Checkout Started', 
        step: 'started',
        count: total 
      },
      { 
        name: 'Login Completed', 
        step: 'login',
        count: sessions.filter(s => 
          ['address', 'payment', 'confirmation'].includes(s.current_step) || 
          s.status === 'completed'
        ).length 
      },
      { 
        name: 'Address Completed', 
        step: 'address',
        count: sessions.filter(s => 
          ['payment', 'confirmation'].includes(s.current_step) || 
          s.status === 'completed'
        ).length 
      },
      { 
        name: 'Payment Initiated', 
        step: 'payment',
        count: sessions.filter(s => s.payment_attempts > 0).length 
      },
      { 
        name: 'Payment Successful', 
        step: 'completed',
        count: sessions.filter(s => s.status === 'completed').length 
      },
    ];

    return steps.map((step, index) => {
      const prevCount = index > 0 ? steps[index - 1].count : step.count;
      const dropOff = prevCount > 0 ? ((prevCount - step.count) / prevCount) * 100 : 0;
      
      return {
        ...step,
        percentage: total > 0 ? Math.round((step.count / total) * 100) : 0,
        dropOffRate: Math.round(dropOff),
      };
    });
  }, [sessions]);

  // Calculate trend data
  const trendData: TrendDataPoint[] = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const days = eachDayOf({ start: filters.dateRange.from, end: filters.dateRange.to });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySessions = sessions.filter(s => 
        format(new Date(s.created_at), 'yyyy-MM-dd') === dayStr
      );
      
      const total = daySessions.length;
      const completed = daySessions.filter(s => s.status === 'completed').length;
      const withPaymentAttempts = daySessions.filter(s => s.payment_attempts > 0).length;
      
      return {
        date: format(day, 'MMM d'),
        conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        paymentSuccessRate: withPaymentAttempts > 0 
          ? Math.round((completed / withPaymentAttempts) * 100) 
          : 0,
        sessions: total,
        completed,
      };
    });
  }, [sessions, filters.dateRange]);

  // Calculate session breakdown by date
  const sessionBreakdown: SessionBreakdown[] = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const days = eachDayOf({ start: filters.dateRange.from, end: filters.dateRange.to });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySessions = sessions.filter(s => 
        format(new Date(s.created_at), 'yyyy-MM-dd') === dayStr
      );
      
      const started = daySessions.length;
      const initiated = daySessions.filter(s => s.payment_attempts > 0).length;
      const successful = daySessions.filter(s => s.status === 'completed').length;
      
      // Calculate average checkout time
      const completedSessions = daySessions.filter(s => s.status === 'completed' && s.completed_at);
      let avgTime = 0;
      if (completedSessions.length > 0) {
        const totalTime = completedSessions.reduce((acc, s) => {
          const start = new Date(s.created_at).getTime();
          const end = new Date(s.completed_at!).getTime();
          return acc + (end - start);
        }, 0);
        avgTime = Math.round(totalTime / completedSessions.length / 1000);
      }

      return {
        date: format(day, 'MMM d, yyyy'),
        sessionsStarted: started,
        paymentsInitiated: initiated,
        paymentsSuccessful: successful,
        conversionPercent: started > 0 ? Math.round((successful / started) * 100) : 0,
        avgCheckoutTime: avgTime,
      };
    }).filter(d => d.sessionsStarted > 0);
  }, [sessions, filters.dateRange]);

  // RTO metrics
  const rtoMetrics: RTOMetrics = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalPaidOrders: 0,
        deliveredSuccessfully: 0,
        ordersRefunded: 0,
        deliveryFailed: 0,
        netRevenueLoss: 0,
      };
    }

    // Only count prepaid orders (exclude COD)
    const prepaidOrders = orders.filter(o => o.payment_method !== 'cod');
    const total = prepaidOrders.length;
    const delivered = prepaidOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    const refunded = prepaidOrders.filter(o => o.status === 'refunded').length;
    const failed = prepaidOrders.filter(o => 
      o.status === 'delivery_failed' || 
      o.status === 'returned' ||
      o.status === 'cancelled'
    ).length;

    const lossRate = total > 0 ? Math.round(((refunded + failed) / total) * 100) : 0;

    return {
      totalPaidOrders: total,
      deliveredSuccessfully: delivered,
      ordersRefunded: refunded,
      deliveryFailed: failed,
      netRevenueLoss: lossRate,
    };
  }, [orders]);

  // Failure reasons breakdown
  const failureReasons: FailureReason[] = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const failedOrders = orders.filter(o => 
      o.status === 'refunded' || 
      o.status === 'delivery_failed' || 
      o.status === 'returned' ||
      o.status === 'cancelled'
    );

    const reasonCounts: Record<string, number> = {};
    failedOrders.forEach(o => {
      const reason = o.status || 'unknown';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const total = failedOrders.length;
    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason: formatReason(reason),
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // Location failure analysis
  const locationFailures: LocationFailure[] = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const locationStats: Record<string, { total: number; failures: number }> = {};
    
    orders.forEach(o => {
      const location = o.shipping_pincode || o.shipping_city || 'Unknown';
      if (!locationStats[location]) {
        locationStats[location] = { total: 0, failures: 0 };
      }
      locationStats[location].total++;
      if (['refunded', 'delivery_failed', 'returned', 'cancelled'].includes(o.status)) {
        locationStats[location].failures++;
      }
    });

    return Object.entries(locationStats)
      .map(([location, stats]) => ({
        location,
        totalOrders: stats.total,
        failures: stats.failures,
        failureRate: stats.total > 0 ? Math.round((stats.failures / stats.total) * 100) : 0,
      }))
      .filter(l => l.failures > 0)
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 20);
  }, [orders]);

  // Payment method breakdown
  const paymentMethodStats = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const methodCounts: Record<string, { total: number; successful: number }> = {};
    
    sessions.forEach(s => {
      const method = s.selected_payment_method || 'unknown';
      if (method === 'cod') return; // Skip COD
      
      if (!methodCounts[method]) {
        methodCounts[method] = { total: 0, successful: 0 };
      }
      methodCounts[method].total++;
      if (s.status === 'completed') {
        methodCounts[method].successful++;
      }
    });

    return Object.entries(methodCounts)
      .map(([method, stats]) => ({
        method: formatPaymentMethod(method),
        total: stats.total,
        successful: stats.successful,
        successRate: stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [sessions]);

  // Real-time subscription
  useEffect(() => {
    if (!merchantId) return;

    const channel = merchantSupabase
      .channel('checkout-reports-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `merchant_id=eq.${merchantId}`,
        },
        () => {
          refetchSessions();
        }
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(channel);
    };
  }, [merchantId, refetchSessions]);

  return {
    conversionMetrics,
    funnelData,
    trendData,
    sessionBreakdown,
    rtoMetrics,
    failureReasons,
    locationFailures,
    paymentMethodStats,
    sessions,
    orders,
    isLoading: sessionsLoading || attemptsLoading || ordersLoading,
    refetch: refetchSessions,
  };
}

function formatReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    refunded: 'Customer Refund',
    delivery_failed: 'Delivery Failed',
    returned: 'Returned to Sender',
    cancelled: 'Order Cancelled',
    unknown: 'Unknown',
  };
  return reasonMap[reason] || reason;
}

function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    upi: 'UPI',
    card: 'Cards',
    wallet: 'Wallets',
    emi: 'EMI',
    netbanking: 'Net Banking',
    unknown: 'Unknown',
  };
  return methodMap[method] || method;
}

// Export CSV helper
export function exportToCSV(data: SessionBreakdown[], filename: string) {
  const headers = ['Date', 'Sessions Started', 'Payments Initiated', 'Payments Successful', 'Conversion %', 'Avg Checkout Time (s)'];
  const rows = data.map(d => [
    d.date,
    d.sessionsStarted,
    d.paymentsInitiated,
    d.paymentsSuccessful,
    d.conversionPercent,
    d.avgCheckoutTime,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}
