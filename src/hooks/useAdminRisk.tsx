import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface RiskRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: Json;
  threshold_value: number | null;
  time_window_minutes: number | null;
  scope: string;
  scope_id: string | null;
  action: string;
  severity: string;
  priority: number;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  version: number;
}

export interface RiskEvaluation {
  id: string;
  session_id: string;
  risk_score: number;
  signals: Json;
  rules_triggered: Json;
  decision: string;
  decision_reason: string | null;
  evaluated_at: string;
  metadata: Json;
}

export interface BlockedEntity {
  id: string;
  entity_type: string;
  entity_identifier: string;
  entity_identifier_masked: string | null;
  block_reason: string;
  risk_score: number | null;
  rule_id: string | null;
  rule_name: string | null;
  session_id: string | null;
  blocked_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  is_whitelisted: boolean;
  unblocked_at: string | null;
  unblocked_by: string | null;
  unblock_reason: string | null;
  admin_notes: string | null;
  created_by: string | null;
  metadata: Json;
}

export interface RiskMetrics {
  totalEvaluated: number;
  flagged: number;
  blocked: number;
  blockRate: number;
  falsePositiveOverrides: number;
  avgRiskScore: number;
}

export interface RiskSignal {
  name: string;
  count: number;
  severity: string;
}

export interface RiskDistribution {
  range: string;
  count: number;
  blocked: number;
}

export interface BlockedFilters {
  entityType?: string;
  blockReason?: string;
  ruleId?: string;
  status?: 'active' | 'expired' | 'unblocked' | 'whitelisted';
  dateRange?: { from: Date; to: Date };
}

export function useAdminRisk() {
  const [rules, setRules] = useState<RiskRule[]>([]);
  const [evaluations, setEvaluations] = useState<RiskEvaluation[]>([]);
  const [blockedEntities, setBlockedEntities] = useState<BlockedEntity[]>([]);
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [signals, setSignals] = useState<RiskSignal[]>([]);
  const [distribution, setDistribution] = useState<RiskDistribution[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch risk metrics
  const fetchMetrics = useCallback(async () => {
    try {
      // Get total evaluations
      const { count: totalCount } = await supabase
        .from('risk_evaluations')
        .select('*', { count: 'exact', head: true });

      // Get flagged count
      const { count: flaggedCount } = await supabase
        .from('risk_evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('decision', 'flag');

      // Get blocked count
      const { count: blockedCount } = await supabase
        .from('risk_evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('decision', 'block');

      // Get false positive overrides (unblocked entities)
      const { count: overrideCount } = await supabase
        .from('blocked_entities')
        .select('*', { count: 'exact', head: true })
        .not('unblocked_at', 'is', null);

      // Get average risk score
      const { data: scoreData } = await supabase
        .from('risk_evaluations')
        .select('risk_score');

      const avgScore = scoreData && scoreData.length > 0
        ? scoreData.reduce((sum, e) => sum + e.risk_score, 0) / scoreData.length
        : 0;

      const total = totalCount || 0;
      const blocked = blockedCount || 0;

      setMetrics({
        totalEvaluated: total,
        flagged: flaggedCount || 0,
        blocked,
        blockRate: total > 0 ? (blocked / total) * 100 : 0,
        falsePositiveOverrides: overrideCount || 0,
        avgRiskScore: Math.round(avgScore),
      });
    } catch (err) {
      console.error('Error fetching risk metrics:', err);
    }
  }, []);

  // Fetch risk score distribution
  const fetchDistribution = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('risk_evaluations')
        .select('risk_score, decision');

      if (!data) return;

      const ranges = [
        { range: '0-20', min: 0, max: 20 },
        { range: '21-40', min: 21, max: 40 },
        { range: '41-60', min: 41, max: 60 },
        { range: '61-80', min: 61, max: 80 },
        { range: '81-100', min: 81, max: 100 },
      ];

      const dist = ranges.map(r => ({
        range: r.range,
        count: data.filter(e => e.risk_score >= r.min && e.risk_score <= r.max).length,
        blocked: data.filter(e => e.risk_score >= r.min && e.risk_score <= r.max && e.decision === 'block').length,
      }));

      setDistribution(dist);
    } catch (err) {
      console.error('Error fetching distribution:', err);
    }
  }, []);

  // Fetch top risk signals
  const fetchSignals = useCallback(async () => {
    try {
      const { data: rulesData } = await supabase
        .from('risk_rules')
        .select('name, rule_type, trigger_count, severity')
        .order('trigger_count', { ascending: false })
        .limit(10);

      if (rulesData) {
        setSignals(rulesData.map(r => ({
          name: r.name,
          count: r.trigger_count,
          severity: r.severity,
        })));
      }
    } catch (err) {
      console.error('Error fetching signals:', err);
    }
  }, []);

  // Fetch all risk rules
  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('risk_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      setRules((data || []) as RiskRule[]);
    } catch (err) {
      console.error('Error fetching rules:', err);
      toast.error('Failed to load risk rules');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new risk rule
  const createRule = useCallback(async (rule: Partial<RiskRule>) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const insertData = {
        name: rule.name || 'Unnamed Rule',
        rule_type: rule.rule_type || 'velocity',
        conditions: (rule.conditions || {}) as Json,
        threshold_value: rule.threshold_value,
        time_window_minutes: rule.time_window_minutes,
        scope: rule.scope || 'global',
        action: rule.action || 'flag',
        severity: rule.severity || 'medium',
        priority: rule.priority || 50,
        description: rule.description,
        created_by: userId,
      };

      const { data, error } = await supabase
        .from('risk_rules')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Log admin action
      await supabase.from('risk_admin_actions').insert([{
        action_type: 'rule_created',
        target_type: 'rule',
        target_id: data.id,
        admin_id: userId,
        reason: 'New rule created',
        new_state: data as unknown as Json,
      }]);

      toast.success('Rule created successfully');
      await fetchRules();
      return data;
    } catch (err) {
      console.error('Error creating rule:', err);
      toast.error('Failed to create rule');
      throw err;
    }
  }, [fetchRules]);

  // Update a risk rule
  const updateRule = useCallback(async (ruleId: string, updates: Partial<RiskRule>, reason: string) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Get current state
      const { data: currentRule } = await supabase
        .from('risk_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (!currentRule) throw new Error('Rule not found');

      // Create version record
      await supabase.from('risk_rule_versions').insert([{
        rule_id: ruleId,
        version: currentRule.version,
        previous_state: currentRule as unknown as Json,
        new_state: { ...currentRule, ...updates } as unknown as Json,
        change_reason: reason,
        changed_by: userId,
      }]);

      // Update rule
      const { data, error } = await supabase
        .from('risk_rules')
        .update({
          ...updates,
          conditions: updates.conditions as Json,
          version: currentRule.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;

      // Log admin action
      await supabase.from('risk_admin_actions').insert([{
        action_type: 'rule_updated',
        target_type: 'rule',
        target_id: ruleId,
        admin_id: userId,
        reason,
        previous_state: currentRule as unknown as Json,
        new_state: data as unknown as Json,
      }]);

      toast.success('Rule updated successfully');
      await fetchRules();
      return data;
    } catch (err) {
      console.error('Error updating rule:', err);
      toast.error('Failed to update rule');
      throw err;
    }
  }, [fetchRules]);

  // Toggle rule active status
  const toggleRuleStatus = useCallback(async (ruleId: string, isActive: boolean, reason: string) => {
    return updateRule(ruleId, { is_active: isActive }, reason);
  }, [updateRule]);

  // Fetch blocked entities
  const fetchBlockedEntities = useCallback(async (filters?: BlockedFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('blocked_entities')
        .select('*')
        .order('blocked_at', { ascending: false });

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.blockReason) {
        query = query.ilike('block_reason', `%${filters.blockReason}%`);
      }

      if (filters?.ruleId) {
        query = query.eq('rule_id', filters.ruleId);
      }

      if (filters?.status === 'active') {
        query = query.is('unblocked_at', null).eq('is_whitelisted', false);
      } else if (filters?.status === 'expired') {
        query = query.lt('expires_at', new Date().toISOString()).is('unblocked_at', null);
      } else if (filters?.status === 'unblocked') {
        query = query.not('unblocked_at', 'is', null);
      } else if (filters?.status === 'whitelisted') {
        query = query.eq('is_whitelisted', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBlockedEntities((data || []) as BlockedEntity[]);
    } catch (err) {
      console.error('Error fetching blocked entities:', err);
      toast.error('Failed to load blocked entities');
    } finally {
      setLoading(false);
    }
  }, []);

  // Unblock an entity
  const unblockEntity = useCallback(async (entityId: string, reason: string, permanent: boolean = false) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const updates: Record<string, unknown> = {
        unblocked_at: new Date().toISOString(),
        unblocked_by: userId,
        unblock_reason: reason,
      };

      if (permanent) {
        updates.is_whitelisted = true;
      }

      const { error } = await supabase
        .from('blocked_entities')
        .update(updates)
        .eq('id', entityId);

      if (error) throw error;

      // Log admin action
      await supabase.from('risk_admin_actions').insert([{
        action_type: permanent ? 'entity_whitelisted' : 'entity_unblocked',
        target_type: 'blocked_entity',
        target_id: entityId,
        admin_id: userId,
        reason,
      }]);

      toast.success(permanent ? 'Entity whitelisted' : 'Entity unblocked');
      await fetchBlockedEntities();
    } catch (err) {
      console.error('Error unblocking entity:', err);
      toast.error('Failed to unblock entity');
      throw err;
    }
  }, [fetchBlockedEntities]);

  // Add admin note to blocked entity
  const addEntityNote = useCallback(async (entityId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('blocked_entities')
        .update({ admin_notes: note })
        .eq('id', entityId);

      if (error) throw error;
      toast.success('Note added');
      await fetchBlockedEntities();
    } catch (err) {
      console.error('Error adding note:', err);
      toast.error('Failed to add note');
    }
  }, [fetchBlockedEntities]);

  // Block a new entity manually
  const blockEntity = useCallback(async (
    entityType: string,
    entityIdentifier: string,
    reason: string,
    expiresAt?: string,
    isPermanent: boolean = false
  ) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from('blocked_entities')
        .insert([{
          entity_type: entityType,
          entity_identifier: entityIdentifier,
          entity_identifier_masked: entityIdentifier.substring(0, 4) + '****',
          block_reason: reason,
          expires_at: expiresAt,
          is_permanent: isPermanent,
          created_by: userId,
        }])
        .select()
        .single();

      if (error) throw error;

      // Log admin action
      await supabase.from('risk_admin_actions').insert([{
        action_type: 'entity_blocked',
        target_type: 'blocked_entity',
        target_id: data.id,
        admin_id: userId,
        reason,
        new_state: data as unknown as Json,
      }]);

      toast.success('Entity blocked');
      await fetchBlockedEntities();
      return data;
    } catch (err) {
      console.error('Error blocking entity:', err);
      toast.error('Failed to block entity');
      throw err;
    }
  }, [fetchBlockedEntities]);

  // Fetch risk evaluations
  const fetchEvaluations = useCallback(async (sessionId?: string) => {
    try {
      let query = supabase
        .from('risk_evaluations')
        .select('*')
        .order('evaluated_at', { ascending: false })
        .limit(100);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvaluations((data || []) as RiskEvaluation[]);
    } catch (err) {
      console.error('Error fetching evaluations:', err);
    }
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('risk-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_rules' }, () => {
        fetchRules();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_entities' }, () => {
        fetchBlockedEntities();
        fetchMetrics();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'risk_evaluations' }, () => {
        fetchMetrics();
        fetchDistribution();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRules, fetchBlockedEntities, fetchMetrics, fetchDistribution]);

  return {
    rules,
    evaluations,
    blockedEntities,
    metrics,
    signals,
    distribution,
    loading,
    fetchMetrics,
    fetchDistribution,
    fetchSignals,
    fetchRules,
    createRule,
    updateRule,
    toggleRuleStatus,
    fetchBlockedEntities,
    unblockEntity,
    addEntityNote,
    blockEntity,
    fetchEvaluations,
  };
}