-- Create risk_rules table
CREATE TABLE public.risk_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL, -- velocity, payment_failure, gateway_abuse, amount_anomaly, device_reuse, geo_ip
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  threshold_value NUMERIC,
  time_window_minutes INTEGER DEFAULT 60,
  scope TEXT NOT NULL DEFAULT 'global', -- global, gateway, merchant
  scope_id UUID,
  action TEXT NOT NULL DEFAULT 'flag', -- allow, flag, block
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  priority INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  version INTEGER NOT NULL DEFAULT 1
);

-- Create risk_rule_versions for audit trail
CREATE TABLE public.risk_rule_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.risk_rules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  previous_state JSONB NOT NULL,
  new_state JSONB NOT NULL,
  change_reason TEXT,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create risk_evaluations table
CREATE TABLE public.risk_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL DEFAULT 0,
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules_triggered JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision TEXT NOT NULL DEFAULT 'allow', -- allow, flag, block
  decision_reason TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create blocked_entities table
CREATE TABLE public.blocked_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- session, ip, device, user
  entity_identifier TEXT NOT NULL,
  entity_identifier_masked TEXT,
  block_reason TEXT NOT NULL,
  risk_score INTEGER,
  rule_id UUID REFERENCES public.risk_rules(id),
  rule_name TEXT,
  session_id UUID REFERENCES public.checkout_sessions(id),
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  is_whitelisted BOOLEAN NOT NULL DEFAULT false,
  unblocked_at TIMESTAMPTZ,
  unblocked_by UUID,
  unblock_reason TEXT,
  admin_notes TEXT,
  created_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create risk_admin_actions for audit
CREATE TABLE public.risk_admin_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL, -- rule_created, rule_updated, rule_disabled, entity_blocked, entity_unblocked, entity_whitelisted
  target_type TEXT NOT NULL, -- rule, blocked_entity, evaluation
  target_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  reason TEXT,
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_rules
CREATE POLICY "Admins can manage risk rules" ON public.risk_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for risk_rule_versions
CREATE POLICY "Admins can view rule versions" ON public.risk_rule_versions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert rule versions" ON public.risk_rule_versions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for risk_evaluations
CREATE POLICY "Admins can view all evaluations" ON public.risk_evaluations
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert evaluations" ON public.risk_evaluations
  FOR INSERT WITH CHECK (true);

-- RLS Policies for blocked_entities
CREATE POLICY "Admins can manage blocked entities" ON public.blocked_entities
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for risk_admin_actions
CREATE POLICY "Admins can view risk admin actions" ON public.risk_admin_actions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert risk admin actions" ON public.risk_admin_actions
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_risk_rules_active ON public.risk_rules(is_active);
CREATE INDEX idx_risk_rules_type ON public.risk_rules(rule_type);
CREATE INDEX idx_risk_evaluations_session ON public.risk_evaluations(session_id);
CREATE INDEX idx_risk_evaluations_decision ON public.risk_evaluations(decision);
CREATE INDEX idx_blocked_entities_type ON public.blocked_entities(entity_type);
CREATE INDEX idx_blocked_entities_active ON public.blocked_entities(is_whitelisted, unblocked_at);
CREATE INDEX idx_blocked_entities_expires ON public.blocked_entities(expires_at);

-- Insert default risk rules
INSERT INTO public.risk_rules (name, description, rule_type, conditions, threshold_value, time_window_minutes, action, severity, priority) VALUES
  ('High Velocity IP', 'Block IPs with too many checkout attempts', 'velocity', '{"field": "ip_address", "operator": "count_per_window"}', 50, 60, 'block', 'high', 10),
  ('Device Fingerprint Reuse', 'Flag devices used across multiple accounts', 'device_reuse', '{"field": "device_fingerprint", "operator": "unique_users"}', 3, 1440, 'flag', 'medium', 20),
  ('Payment Failure Threshold', 'Block after multiple payment failures', 'payment_failure', '{"field": "payment_attempts", "operator": "failure_rate"}', 5, 30, 'block', 'high', 15),
  ('Amount Anomaly Detection', 'Flag unusually high transaction amounts', 'amount_anomaly', '{"field": "amount", "operator": "percentile"}', 99, 10080, 'flag', 'medium', 30),
  ('Gateway Error Abuse', 'Block sessions exploiting gateway errors', 'gateway_abuse', '{"field": "gateway_errors", "operator": "count"}', 10, 60, 'block', 'critical', 5);