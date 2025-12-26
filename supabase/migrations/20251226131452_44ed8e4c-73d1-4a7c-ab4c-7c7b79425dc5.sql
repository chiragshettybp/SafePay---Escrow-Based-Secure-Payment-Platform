-- Create payment_gateways table for platform-level gateway configuration
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'disabled')),
  environment TEXT NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'live', 'both')),
  supported_methods TEXT[] NOT NULL DEFAULT ARRAY['UPI', 'Cards', 'Wallets', 'EMI', 'NetBanking'],
  priority INTEGER NOT NULL DEFAULT 10,
  config JSONB DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  min_amount NUMERIC DEFAULT 0,
  max_amount NUMERIC DEFAULT 10000000,
  enabled_merchants UUID[] DEFAULT NULL,
  disabled_merchants UUID[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  disabled_at TIMESTAMP WITH TIME ZONE,
  disabled_by UUID,
  disabled_reason TEXT,
  last_status_change_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_status_change_by UUID
);

-- Create gateway_health_metrics table for real-time health tracking
CREATE TABLE IF NOT EXISTS public.gateway_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  success_rate_1h NUMERIC NOT NULL DEFAULT 100,
  success_rate_24h NUMERIC NOT NULL DEFAULT 100,
  failure_rate_1h NUMERIC NOT NULL DEFAULT 0,
  failure_rate_24h NUMERIC NOT NULL DEFAULT 0,
  timeout_rate_1h NUMERIC NOT NULL DEFAULT 0,
  timeout_rate_24h NUMERIC NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER NOT NULL DEFAULT 0,
  total_attempts_1h INTEGER NOT NULL DEFAULT 0,
  total_attempts_24h INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gateway_incidents table for tracking outages and issues
CREATE TABLE IF NOT EXISTS public.gateway_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('outage', 'degradation', 'high_failure', 'high_latency', 'manual_disable')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  resolved_by UUID,
  resolution_notes TEXT,
  auto_detected BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- Create gateway_overrides table for temporary routing rules
CREATE TABLE IF NOT EXISTS public.gateway_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL CHECK (override_type IN ('disable', 'priority_change', 'method_restrict', 'amount_restrict', 'merchant_restrict')),
  reason TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gateway_routing_rules table for global routing configuration
CREATE TABLE IF NOT EXISTS public.gateway_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create gateway_admin_actions table for audit trail
CREATE TABLE IF NOT EXISTS public.gateway_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gateway_error_logs table
CREATE TABLE IF NOT EXISTS public.gateway_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  session_id UUID,
  attempt_id UUID,
  error_code TEXT,
  error_message TEXT,
  payment_method TEXT,
  merchant_id UUID,
  amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin can read/write, service role full access
CREATE POLICY "Admins can view payment gateways" ON public.payment_gateways
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage payment gateways" ON public.payment_gateways
  FOR ALL USING (true);

CREATE POLICY "Admins can view gateway health" ON public.gateway_health_metrics
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage gateway health" ON public.gateway_health_metrics
  FOR ALL USING (true);

CREATE POLICY "Admins can view gateway incidents" ON public.gateway_incidents
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage gateway incidents" ON public.gateway_incidents
  FOR ALL USING (true);

CREATE POLICY "Admins can view gateway overrides" ON public.gateway_overrides
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage gateway overrides" ON public.gateway_overrides
  FOR ALL USING (true);

CREATE POLICY "Admins can view routing rules" ON public.gateway_routing_rules
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage routing rules" ON public.gateway_routing_rules
  FOR ALL USING (true);

CREATE POLICY "Admins can view admin actions" ON public.gateway_admin_actions
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert admin actions" ON public.gateway_admin_actions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view error logs" ON public.gateway_error_logs
  FOR SELECT USING (true);

CREATE POLICY "System can insert error logs" ON public.gateway_error_logs
  FOR INSERT WITH CHECK (true);

-- Insert default gateways
INSERT INTO public.payment_gateways (name, display_name, status, environment, supported_methods, priority, is_default)
VALUES 
  ('razorpay', 'Razorpay', 'active', 'both', ARRAY['UPI', 'Cards', 'Wallets', 'EMI', 'NetBanking'], 1, true),
  ('paytm', 'Paytm', 'active', 'both', ARRAY['UPI', 'Wallets'], 2, false),
  ('phonepe', 'PhonePe', 'active', 'both', ARRAY['UPI'], 3, false),
  ('stripe', 'Stripe', 'disabled', 'test', ARRAY['Cards'], 10, false)
ON CONFLICT (name) DO NOTHING;

-- Insert default routing rules
INSERT INTO public.gateway_routing_rules (rule_name, is_enabled, config)
VALUES 
  ('auto_fallback', true, '{"enabled": true, "max_retries": 2}'),
  ('success_rate_routing', true, '{"enabled": true, "min_success_rate": 90}'),
  ('latency_routing', true, '{"enabled": true, "max_latency_ms": 5000}'),
  ('global_failure_threshold', true, '{"threshold_percent": 30, "auto_disable_duration_minutes": 15}')
ON CONFLICT (rule_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gateway_health_gateway_id ON public.gateway_health_metrics(gateway_id);
CREATE INDEX IF NOT EXISTS idx_gateway_incidents_gateway_id ON public.gateway_incidents(gateway_id);
CREATE INDEX IF NOT EXISTS idx_gateway_incidents_started_at ON public.gateway_incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_gateway_overrides_gateway_id ON public.gateway_overrides(gateway_id);
CREATE INDEX IF NOT EXISTS idx_gateway_overrides_active ON public.gateway_overrides(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gateway_admin_actions_gateway_id ON public.gateway_admin_actions(gateway_id);
CREATE INDEX IF NOT EXISTS idx_gateway_admin_actions_created_at ON public.gateway_admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gateway_error_logs_gateway_id ON public.gateway_error_logs(gateway_id);
CREATE INDEX IF NOT EXISTS idx_gateway_error_logs_created_at ON public.gateway_error_logs(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_gateways;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gateway_health_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gateway_incidents;