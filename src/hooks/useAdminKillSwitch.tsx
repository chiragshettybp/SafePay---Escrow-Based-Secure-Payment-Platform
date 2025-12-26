import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlatformFlag {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PlatformIncident {
  id: string;
  level: number;
  status: 'active' | 'resolved';
  reason: string;
  activated_by: string;
  activated_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  impact_summary: {
    duration_minutes?: number;
    sessions_blocked?: number;
    payments_failed?: number;
  };
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface KillSwitchAuditLog {
  id: string;
  action_type: 'activate' | 'deactivate' | 'escalate' | 'de-escalate';
  incident_id: string | null;
  previous_level: number | null;
  new_level: number | null;
  reason: string;
  admin_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useAdminKillSwitch() {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<PlatformFlag[]>([]);
  const [activeIncident, setActiveIncident] = useState<PlatformIncident | null>(null);
  const [incidents, setIncidents] = useState<PlatformIncident[]>([]);
  const [auditLogs, setAuditLogs] = useState<KillSwitchAuditLog[]>([]);

  // Helper to get flag value
  const getFlagValue = useCallback((key: string): unknown => {
    const flag = flags.find(f => f.key === key);
    if (!flag) return null;
    try {
      return JSON.parse(flag.value);
    } catch {
      return flag.value;
    }
  }, [flags]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('platform_flags')
        .select('*')
        .order('key');

      if (flagsError) throw flagsError;
      setFlags((flagsData || []) as PlatformFlag[]);

      // Fetch active incident
      const { data: activeData } = await supabase
        .from('platform_incidents')
        .select('*')
        .eq('status', 'active')
        .order('activated_at', { ascending: false })
        .limit(1)
        .single();

      setActiveIncident(activeData as PlatformIncident | null);

      // Fetch all incidents
      const { data: incidentsData } = await supabase
        .from('platform_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setIncidents((incidentsData || []) as PlatformIncident[]);

      // Fetch audit logs
      const { data: logsData } = await supabase
        .from('killswitch_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setAuditLogs((logsData || []) as KillSwitchAuditLog[]);
    } catch (err) {
      console.error('Error fetching kill-switch data:', err);
      toast.error('Failed to load platform status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Activate kill-switch
  const activateKillSwitch = useCallback(async (level: 1 | 2 | 3 | 4, reason: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired');
        return false;
      }

      const response = await supabase.functions.invoke('admin-killswitch', {
        body: {
          action: 'activate',
          level,
          reason,
        },
      });

      if (response.error) {
        const errorMessage = response.error.message || 'Failed to activate kill-switch';
        toast.error(errorMessage);
        return false;
      }

      toast.success(`Kill-switch Level ${level} activated`);
      await fetchData();
      return true;
    } catch (err) {
      console.error('Error activating kill-switch:', err);
      toast.error('Failed to activate kill-switch');
      return false;
    }
  }, [fetchData]);

  // Deactivate kill-switch
  const deactivateKillSwitch = useCallback(async (incidentId: string, resolutionNotes: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired');
        return false;
      }

      const response = await supabase.functions.invoke('admin-killswitch', {
        body: {
          action: 'deactivate',
          incident_id: incidentId,
          resolution_notes: resolutionNotes,
        },
      });

      if (response.error) {
        const errorMessage = response.error.message || 'Failed to deactivate kill-switch';
        toast.error(errorMessage);
        return false;
      }

      toast.success('Kill-switch deactivated, system restored');
      await fetchData();
      return true;
    } catch (err) {
      console.error('Error deactivating kill-switch:', err);
      toast.error('Failed to deactivate kill-switch');
      return false;
    }
  }, [fetchData]);

  // Get incident by ID
  const getIncident = useCallback(async (incidentId: string): Promise<PlatformIncident | null> => {
    try {
      const { data, error } = await supabase
        .from('platform_incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (error) throw error;
      return data as PlatformIncident;
    } catch (err) {
      console.error('Error fetching incident:', err);
      return null;
    }
  }, []);

  // Get audit logs for incident
  const getIncidentAuditLogs = useCallback(async (incidentId: string): Promise<KillSwitchAuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('killswitch_audit_log')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as KillSwitchAuditLog[];
    } catch (err) {
      console.error('Error fetching incident logs:', err);
      return [];
    }
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    fetchData();

    // Subscribe to platform_flags changes
    const flagsChannel = supabase
      .channel('platform-flags-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_flags' },
        () => fetchData()
      )
      .subscribe();

    // Subscribe to platform_incidents changes
    const incidentsChannel = supabase
      .channel('platform-incidents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_incidents' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(flagsChannel);
      supabase.removeChannel(incidentsChannel);
    };
  }, [fetchData]);

  // Computed values
  const currentLevel = Number(getFlagValue('active_incident_level')) || 0;
  const isCheckoutLocked = getFlagValue('checkout_locked') === true;
  const isGatewayShutdown = getFlagValue('gateway_shutdown') === true;
  const isPaymentLinksDisabled = getFlagValue('payment_links_disabled') === true;
  const isDegradationWarning = getFlagValue('degradation_warning') === true;

  return {
    loading,
    flags,
    activeIncident,
    incidents,
    auditLogs,
    currentLevel,
    isCheckoutLocked,
    isGatewayShutdown,
    isPaymentLinksDisabled,
    isDegradationWarning,
    activateKillSwitch,
    deactivateKillSwitch,
    getIncident,
    getIncidentAuditLogs,
    refetch: fetchData,
  };
}
