-- Platform Incidents table for kill-switch escalation tracking
CREATE TABLE public.platform_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 4),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  reason TEXT NOT NULL,
  activated_by UUID NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  impact_summary JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Flags table for real-time platform state
CREATE TABLE public.platform_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT 'false'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Kill-switch action log for audit trail
CREATE TABLE public.killswitch_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN ('activate', 'deactivate', 'escalate', 'de-escalate')),
  incident_id UUID REFERENCES public.platform_incidents(id),
  previous_level INTEGER,
  new_level INTEGER,
  reason TEXT NOT NULL,
  admin_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.killswitch_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_incidents
CREATE POLICY "Admins can view all incidents"
  ON public.platform_incidents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert incidents"
  ON public.platform_incidents FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update incidents"
  ON public.platform_incidents FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for platform_flags (read by all for checkout, write by admin)
CREATE POLICY "Anyone can read platform flags"
  ON public.platform_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert platform flags"
  ON public.platform_flags FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform flags"
  ON public.platform_flags FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for killswitch_audit_log (immutable)
CREATE POLICY "Admins can view audit logs"
  ON public.killswitch_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
  ON public.killswitch_audit_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Prevent modification of audit logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Kill-switch audit logs are immutable and cannot be modified or deleted';
END;
$$;

CREATE TRIGGER prevent_killswitch_audit_modification
  BEFORE UPDATE OR DELETE ON public.killswitch_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Insert default platform flags
INSERT INTO public.platform_flags (key, value, description) VALUES
  ('checkout_locked', 'false', 'When true, all new checkout sessions are blocked'),
  ('payment_links_disabled', 'false', 'When true, all payment links return locked state'),
  ('gateway_shutdown', 'false', 'When true, all payment gateways are disabled'),
  ('degradation_warning', 'false', 'When true, show warning banner on checkout'),
  ('active_incident_level', '0', 'Current active kill-switch level (0 = none)'),
  ('active_incident_id', 'null', 'Current active incident ID');

-- Enable realtime for platform flags
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_incidents;