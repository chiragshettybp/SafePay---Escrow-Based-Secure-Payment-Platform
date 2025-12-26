import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentGateway {
  id: string;
  name: string;
  display_name: string;
  status: 'active' | 'degraded' | 'disabled';
  environment: 'test' | 'live' | 'both';
  supported_methods: string[];
  priority: number;
  config: Record<string, unknown>;
  is_default: boolean;
  min_amount: number | null;
  max_amount: number | null;
  enabled_merchants: string[] | null;
  disabled_merchants: string[] | null;
  created_at: string;
  updated_at: string;
  disabled_at: string | null;
  disabled_by: string | null;
  disabled_reason: string | null;
  last_status_change_at: string | null;
  last_status_change_by: string | null;
}

export interface GatewayHealthMetrics {
  id: string;
  gateway_id: string;
  success_rate_1h: number;
  success_rate_24h: number;
  failure_rate_1h: number;
  failure_rate_24h: number;
  timeout_rate_1h: number;
  timeout_rate_24h: number;
  avg_latency_ms: number;
  total_attempts_1h: number;
  total_attempts_24h: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  updated_at: string;
}

export interface GatewayIncident {
  id: string;
  gateway_id: string;
  incident_type: 'outage' | 'degradation' | 'high_failure' | 'high_latency' | 'manual_disable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  started_at: string;
  resolved_at: string | null;
  created_by: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  auto_detected: boolean;
  metadata: Record<string, unknown>;
}

export interface GatewayOverride {
  id: string;
  gateway_id: string;
  override_type: 'disable' | 'priority_change' | 'method_restrict' | 'amount_restrict' | 'merchant_restrict';
  reason: string;
  config: Record<string, unknown>;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface RoutingRule {
  id: string;
  rule_name: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface GatewayAdminAction {
  id: string;
  gateway_id: string | null;
  admin_id: string;
  action_type: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface GatewayErrorLog {
  id: string;
  gateway_id: string | null;
  session_id: string | null;
  attempt_id: string | null;
  error_code: string | null;
  error_message: string | null;
  payment_method: string | null;
  merchant_id: string | null;
  amount: number | null;
  created_at: string;
}

export interface GatewayWithHealth extends PaymentGateway {
  health?: GatewayHealthMetrics;
  activeIncidents?: GatewayIncident[];
  activeOverrides?: GatewayOverride[];
}

export function useAdminGateways() {
  const [gateways, setGateways] = useState<GatewayWithHealth[]>([]);
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGateways = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch gateways
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('priority', { ascending: true });

      if (gatewaysError) throw gatewaysError;

      // Fetch health metrics
      const { data: healthData } = await supabase
        .from('gateway_health_metrics')
        .select('*');

      // Fetch active incidents
      const { data: incidentsData } = await supabase
        .from('gateway_incidents')
        .select('*')
        .is('resolved_at', null);

      // Fetch active overrides
      const { data: overridesData } = await supabase
        .from('gateway_overrides')
        .select('*')
        .eq('is_active', true);

      // Combine data
      const gatewaysWithHealth: GatewayWithHealth[] = (gatewaysData || []).map(gateway => ({
        ...gateway,
        status: gateway.status as PaymentGateway['status'],
        environment: gateway.environment as PaymentGateway['environment'],
        config: (gateway.config || {}) as Record<string, unknown>,
        health: healthData?.find(h => h.gateway_id === gateway.id),
        activeIncidents: (incidentsData?.filter(i => i.gateway_id === gateway.id) || []).map(i => ({
          ...i,
          incident_type: i.incident_type as GatewayIncident['incident_type'],
          severity: i.severity as GatewayIncident['severity'],
          metadata: (i.metadata || {}) as Record<string, unknown>,
        })),
        activeOverrides: (overridesData?.filter(o => o.gateway_id === gateway.id) || []).map(o => ({
          ...o,
          override_type: o.override_type as GatewayOverride['override_type'],
          config: (o.config || {}) as Record<string, unknown>,
        })),
      }));

      setGateways(gatewaysWithHealth);
      setError(null);
    } catch (err) {
      console.error('Error fetching gateways:', err);
      setError('Failed to fetch gateways');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRoutingRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gateway_routing_rules')
        .select('*')
        .order('rule_name');

      if (error) throw error;
      setRoutingRules((data || []).map(r => ({
        ...r,
        config: (r.config || {}) as Record<string, unknown>,
      })));
    } catch (err) {
      console.error('Error fetching routing rules:', err);
    }
  }, []);

  const updateGatewayStatus = useCallback(async (
    gatewayId: string, 
    status: 'active' | 'degraded' | 'disabled',
    reason: string
  ) => {
    try {
      const gateway = gateways.find(g => g.id === gatewayId);
      if (!gateway) throw new Error('Gateway not found');

      const previousState = { status: gateway.status };
      
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        last_status_change_at: new Date().toISOString(),
      };

      if (status === 'disabled') {
        updateData.disabled_at = new Date().toISOString();
        updateData.disabled_reason = reason;
      } else {
        updateData.disabled_at = null;
        updateData.disabled_reason = null;
      }

      const { error } = await supabase
        .from('payment_gateways')
        .update(updateData)
        .eq('id', gatewayId);

      if (error) throw error;

      // Log admin action
      await supabase.from('gateway_admin_actions').insert({
        gateway_id: gatewayId,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: `status_change_to_${status}`,
        previous_state: previousState,
        new_state: { status, reason },
        reason,
      });

      toast.success(`Gateway ${status === 'disabled' ? 'disabled' : 'enabled'} successfully`);
      await fetchGateways();
    } catch (err) {
      console.error('Error updating gateway status:', err);
      toast.error('Failed to update gateway status');
      throw err;
    }
  }, [gateways, fetchGateways]);

  const updateGatewayPriority = useCallback(async (gatewayId: string, priority: number) => {
    try {
      const gateway = gateways.find(g => g.id === gatewayId);
      if (!gateway) throw new Error('Gateway not found');

      const { error } = await supabase
        .from('payment_gateways')
        .update({ priority, updated_at: new Date().toISOString() })
        .eq('id', gatewayId);

      if (error) throw error;

      // Log admin action
      await supabase.from('gateway_admin_actions').insert({
        gateway_id: gatewayId,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'priority_change',
        previous_state: { priority: gateway.priority },
        new_state: { priority },
        reason: `Priority changed from ${gateway.priority} to ${priority}`,
      });

      toast.success('Gateway priority updated');
      await fetchGateways();
    } catch (err) {
      console.error('Error updating gateway priority:', err);
      toast.error('Failed to update priority');
      throw err;
    }
  }, [gateways, fetchGateways]);

  const updateRoutingRule = useCallback(async (ruleName: string, isEnabled: boolean, config?: Record<string, unknown>) => {
    try {
      const updateData: Record<string, unknown> = {
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        updateData.config = config;
      }

      const { error } = await supabase
        .from('gateway_routing_rules')
        .update(updateData)
        .eq('rule_name', ruleName);

      if (error) throw error;

      toast.success('Routing rule updated');
      await fetchRoutingRules();
    } catch (err) {
      console.error('Error updating routing rule:', err);
      toast.error('Failed to update routing rule');
      throw err;
    }
  }, [fetchRoutingRules]);

  const createIncident = useCallback(async (
    gatewayId: string,
    incidentType: GatewayIncident['incident_type'],
    severity: GatewayIncident['severity'],
    title: string,
    description?: string
  ) => {
    try {
      const { error } = await supabase.from('gateway_incidents').insert({
        gateway_id: gatewayId,
        incident_type: incidentType,
        severity,
        title,
        description,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        auto_detected: false,
      });

      if (error) throw error;
      toast.success('Incident created');
      await fetchGateways();
    } catch (err) {
      console.error('Error creating incident:', err);
      toast.error('Failed to create incident');
      throw err;
    }
  }, [fetchGateways]);

  const resolveIncident = useCallback(async (incidentId: string, resolutionNotes: string) => {
    try {
      const { error } = await supabase
        .from('gateway_incidents')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolution_notes: resolutionNotes,
        })
        .eq('id', incidentId);

      if (error) throw error;
      toast.success('Incident resolved');
      await fetchGateways();
    } catch (err) {
      console.error('Error resolving incident:', err);
      toast.error('Failed to resolve incident');
      throw err;
    }
  }, [fetchGateways]);

  const createOverride = useCallback(async (
    gatewayId: string,
    overrideType: GatewayOverride['override_type'],
    reason: string,
    config: Record<string, unknown>,
    expiresAt?: string
  ) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from('gateway_overrides').insert([{
        gateway_id: gatewayId,
        override_type: overrideType,
        reason,
        config: config as unknown as import('@/integrations/supabase/types').Json,
        expires_at: expiresAt,
        created_by: userId,
      }]);

      if (error) throw error;
      toast.success('Override created');
      await fetchGateways();
    } catch (err) {
      console.error('Error creating override:', err);
      toast.error('Failed to create override');
      throw err;
    }
  }, [fetchGateways]);

  const deactivateOverride = useCallback(async (overrideId: string) => {
    try {
      const { error } = await supabase
        .from('gateway_overrides')
        .update({ is_active: false })
        .eq('id', overrideId);

      if (error) throw error;
      toast.success('Override deactivated');
      await fetchGateways();
    } catch (err) {
      console.error('Error deactivating override:', err);
      toast.error('Failed to deactivate override');
      throw err;
    }
  }, [fetchGateways]);

  // Setup realtime subscriptions
  useEffect(() => {
    fetchGateways();
    fetchRoutingRules();

    const gatewaysChannel = supabase
      .channel('admin-gateways')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_gateways' }, () => {
        fetchGateways();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gateway_health_metrics' }, () => {
        fetchGateways();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gateway_incidents' }, () => {
        fetchGateways();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gatewaysChannel);
    };
  }, [fetchGateways, fetchRoutingRules]);

  return {
    gateways,
    routingRules,
    isLoading,
    error,
    refetch: fetchGateways,
    updateGatewayStatus,
    updateGatewayPriority,
    updateRoutingRule,
    createIncident,
    resolveIncident,
    createOverride,
    deactivateOverride,
  };
}

// Hook for single gateway details
export function useAdminGatewayDetails(gatewayId: string) {
  const [gateway, setGateway] = useState<GatewayWithHealth | null>(null);
  const [errorLogs, setErrorLogs] = useState<GatewayErrorLog[]>([]);
  const [adminActions, setAdminActions] = useState<GatewayAdminAction[]>([]);
  const [allIncidents, setAllIncidents] = useState<GatewayIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  const fetchGatewayDetails = useCallback(async () => {
    if (!gatewayId) return;

    try {
      setIsLoading(true);

      // Fetch gateway
      const { data: gatewayData, error: gatewayError } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('id', gatewayId)
        .single();

      if (gatewayError) throw gatewayError;

      // Fetch health metrics
      const { data: healthData } = await supabase
        .from('gateway_health_metrics')
        .select('*')
        .eq('gateway_id', gatewayId)
        .single();

      // Fetch active incidents
      const { data: activeIncidents } = await supabase
        .from('gateway_incidents')
        .select('*')
        .eq('gateway_id', gatewayId)
        .is('resolved_at', null);

      // Fetch active overrides
      const { data: overrides } = await supabase
        .from('gateway_overrides')
        .select('*')
        .eq('gateway_id', gatewayId)
        .eq('is_active', true);

      const mapIncident = (i: typeof activeIncidents extends (infer T)[] | null ? T : never) => ({
        ...i,
        incident_type: i.incident_type as GatewayIncident['incident_type'],
        severity: i.severity as GatewayIncident['severity'],
        metadata: (i.metadata || {}) as Record<string, unknown>,
      });

      const mapOverride = (o: typeof overrides extends (infer T)[] | null ? T : never) => ({
        ...o,
        override_type: o.override_type as GatewayOverride['override_type'],
        config: (o.config || {}) as Record<string, unknown>,
      });

      setGateway({
        ...gatewayData,
        status: gatewayData.status as PaymentGateway['status'],
        environment: gatewayData.environment as PaymentGateway['environment'],
        config: (gatewayData.config || {}) as Record<string, unknown>,
        health: healthData || undefined,
        activeIncidents: (activeIncidents || []).map(mapIncident),
        activeOverrides: (overrides || []).map(mapOverride),
      });

      // Fetch all incidents for history
      const { data: allIncidentsData } = await supabase
        .from('gateway_incidents')
        .select('*')
        .eq('gateway_id', gatewayId)
        .order('started_at', { ascending: false })
        .limit(50);

      setAllIncidents((allIncidentsData || []).map(i => ({
        ...i,
        incident_type: i.incident_type as GatewayIncident['incident_type'],
        severity: i.severity as GatewayIncident['severity'],
        metadata: (i.metadata || {}) as Record<string, unknown>,
      })));

      // Fetch error logs
      const timeFilter = {
        '1h': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      }[timeRange];

      const { data: logsData } = await supabase
        .from('gateway_error_logs')
        .select('*')
        .eq('gateway_id', gatewayId)
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      setErrorLogs(logsData || []);

      // Fetch admin actions
      const { data: actionsData } = await supabase
        .from('gateway_admin_actions')
        .select('*')
        .eq('gateway_id', gatewayId)
        .order('created_at', { ascending: false })
        .limit(50);

      setAdminActions((actionsData || []).map(a => ({
        ...a,
        previous_state: (a.previous_state || null) as Record<string, unknown> | null,
        new_state: (a.new_state || null) as Record<string, unknown> | null,
      })));
    } catch (err) {
      console.error('Error fetching gateway details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gatewayId, timeRange]);

  useEffect(() => {
    fetchGatewayDetails();

    const channel = supabase
      .channel(`gateway-${gatewayId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_gateways', filter: `id=eq.${gatewayId}` }, () => {
        fetchGatewayDetails();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gateway_health_metrics', filter: `gateway_id=eq.${gatewayId}` }, () => {
        fetchGatewayDetails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGatewayDetails, gatewayId]);

  return {
    gateway,
    errorLogs,
    adminActions,
    allIncidents,
    isLoading,
    timeRange,
    setTimeRange,
    refetch: fetchGatewayDetails,
  };
}
