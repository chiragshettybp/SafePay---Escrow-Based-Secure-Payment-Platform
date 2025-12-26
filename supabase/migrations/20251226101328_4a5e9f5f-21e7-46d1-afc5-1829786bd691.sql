-- ADMIN SAFETY & OBSERVABILITY ENFORCEMENT
-- This migration ensures all admin actions are:
-- 1. Fully logged with IP/reason
-- 2. Immutable (no edits/deletes)
-- 3. Protected from self-approval
-- 4. Alertable on failure

-- 1. ADD IMMUTABILITY TO admin_financial_actions_log
CREATE OR REPLACE FUNCTION public.enforce_admin_log_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Admin financial action logs are immutable and cannot be modified or deleted';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_log_modification ON public.admin_financial_actions_log;
CREATE TRIGGER prevent_admin_log_modification
  BEFORE UPDATE OR DELETE ON public.admin_financial_actions_log
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_log_immutability();

-- 2. CREATE ADMIN ALERTS TABLE for failure notifications
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'financial_failure', 'security_violation', 'self_approval_attempt',
    'high_value_action', 'escrow_mismatch', 'suspicious_activity'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  triggered_by UUID,
  triggered_by_type TEXT CHECK (triggered_by_type IN ('admin', 'user', 'system')),
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutability for alerts (can only acknowledge/resolve, not delete)
CREATE OR REPLACE FUNCTION public.enforce_alert_modification_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Admin alerts cannot be deleted';
    RETURN NULL;
  END IF;
  
  -- Only allow updates to acknowledgment and resolution fields
  IF TG_OP = 'UPDATE' THEN
    IF OLD.alert_type != NEW.alert_type 
       OR OLD.severity != NEW.severity
       OR OLD.title != NEW.title
       OR OLD.description != NEW.description
       OR OLD.triggered_by IS DISTINCT FROM NEW.triggered_by
       OR OLD.created_at != NEW.created_at THEN
      RAISE EXCEPTION 'Cannot modify core alert fields, only acknowledgment and resolution allowed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_alert_modification ON public.admin_alerts;
CREATE TRIGGER enforce_alert_modification
  BEFORE UPDATE OR DELETE ON public.admin_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_alert_modification_rules();

-- RLS for admin_alerts
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alerts"
ON public.admin_alerts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts"
ON public.admin_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can acknowledge/resolve alerts"
ON public.admin_alerts FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 3. CREATE SELF-APPROVAL PREVENTION TABLE
-- Track which admin initiated an action vs who approved it
CREATE TABLE IF NOT EXISTS public.admin_pending_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'force_release', 'force_refund', 'escrow_unfreeze', 
    'payout_approve', 'high_value_withdrawal', 'account_unban'
  )),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  initiated_by UUID NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount NUMERIC,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent self-approval at DB level
CREATE OR REPLACE FUNCTION public.prevent_self_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_by = NEW.initiated_by THEN
    -- Log the attempt
    INSERT INTO public.admin_alerts (
      alert_type, severity, title, description,
      related_entity_type, related_entity_id,
      triggered_by, triggered_by_type,
      metadata
    ) VALUES (
      'self_approval_attempt', 'critical',
      'Self-Approval Attempt Blocked',
      format('Admin %s attempted to approve their own %s action on %s %s', 
        NEW.initiated_by, NEW.action_type, NEW.target_type, NEW.target_id),
      NEW.target_type, NEW.target_id,
      NEW.initiated_by, 'admin',
      jsonb_build_object('action_type', NEW.action_type, 'amount', NEW.amount)
    );
    
    RAISE EXCEPTION 'SELF_APPROVAL_BLOCKED: Admin cannot approve their own high-risk action';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_self_approval ON public.admin_pending_approvals;
CREATE TRIGGER prevent_admin_self_approval
  BEFORE UPDATE ON public.admin_pending_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_approval();

-- RLS for pending approvals
ALTER TABLE public.admin_pending_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all pending approvals"
ON public.admin_pending_approvals FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create pending approvals"
ON public.admin_pending_approvals FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pending approvals"
ON public.admin_pending_approvals FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 4. CREATE FUNCTION TO LOG FINANCIAL FAILURES WITH ALERTS
CREATE OR REPLACE FUNCTION public.log_financial_failure(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_error_message TEXT,
  p_admin_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO public.admin_alerts (
    alert_type, severity, title, description,
    related_entity_type, related_entity_id,
    triggered_by, triggered_by_type,
    metadata
  ) VALUES (
    'financial_failure', 
    CASE WHEN p_amount > 50000 THEN 'critical' ELSE 'high' END,
    format('Financial Action Failed: %s', p_action_type),
    format('Failed to complete %s on %s %s: %s', p_action_type, p_target_type, p_target_id, p_error_message),
    p_target_type, p_target_id,
    COALESCE(p_admin_id, auth.uid()), 
    CASE WHEN p_admin_id IS NOT NULL THEN 'admin' ELSE 'system' END,
    jsonb_build_object(
      'action_type', p_action_type,
      'amount', p_amount,
      'error', p_error_message,
      'original_metadata', p_metadata
    )
  ) RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- 5. ADD UNIQUE CONSTRAINT FOR IDEMPOTENCY
ALTER TABLE public.escrow_resolution_log 
ADD CONSTRAINT escrow_resolution_idempotency_unique 
UNIQUE (idempotency_key);

-- 6. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unresolved 
ON public.admin_alerts(severity, created_at) 
WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_alerts_type 
ON public.admin_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_pending_approvals_status 
ON public.admin_pending_approvals(status, expires_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_admin_financial_log_admin 
ON public.admin_financial_actions_log(admin_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_financial_log_target 
ON public.admin_financial_actions_log(target_type, target_id);