-- =====================================================
-- DRAFT PAYMENTS SYSTEM - Complete Database Schema
-- =====================================================

-- 1. Add draft-specific columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_status TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_submitted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_cancelled_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_cancelled_by UUID DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_cancelled_reason TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_deleted_by UUID DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_change_requested_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_change_requested_by UUID DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_change_request_reason TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_rejected_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_rejected_by UUID DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_rejection_reason TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS draft_version INTEGER DEFAULT 1;

-- Add constraint for draft_status values
COMMENT ON COLUMN public.orders.draft_status IS 'active, submitted, cancelled, deleted, expired, change_requested, rejected';

-- 2. Create draft audit log table
CREATE TABLE IF NOT EXISTS public.draft_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- created, edited, submitted, cancelled, deleted, restored, expired, rejected, change_requested
  performed_by UUID NOT NULL,
  performed_by_role TEXT NOT NULL, -- customer, merchant, admin
  previous_state JSONB DEFAULT NULL,
  new_state JSONB DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_draft_audit_order_id ON public.draft_audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_draft_audit_action ON public.draft_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_draft_audit_performed_by ON public.draft_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_draft_audit_created_at ON public.draft_audit_logs(created_at DESC);

-- Index for orders by draft status
CREATE INDEX IF NOT EXISTS idx_orders_draft_status ON public.orders(draft_status) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_orders_draft_expires ON public.orders(draft_expires_at) WHERE status = 'draft' AND draft_status = 'active';

-- 3. Enable RLS on draft_audit_logs
ALTER TABLE public.draft_audit_logs ENABLE ROW LEVEL SECURITY;

-- Customers can view their own draft audit logs
CREATE POLICY "Customers can view their own draft audit logs"
ON public.draft_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = draft_audit_logs.order_id 
    AND o.customer_id = auth.uid()
  )
);

-- Merchants can view draft audit logs for their orders
CREATE POLICY "Merchants can view draft audit logs for their orders"
ON public.draft_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = draft_audit_logs.order_id 
    AND o.merchant_id = auth.uid()
  ) AND has_role(auth.uid(), 'merchant')
);

-- Admins can view all draft audit logs
CREATE POLICY "Admins can view all draft audit logs"
ON public.draft_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System can insert audit logs
CREATE POLICY "System can insert draft audit logs"
ON public.draft_audit_logs
FOR INSERT
WITH CHECK (true);

-- Prevent modification/deletion of audit logs
CREATE POLICY "Audit logs are immutable"
ON public.draft_audit_logs
FOR UPDATE
USING (false);

CREATE POLICY "Audit logs cannot be deleted"
ON public.draft_audit_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- 4. Create function to log draft actions
CREATE OR REPLACE FUNCTION public.log_draft_action(
  p_order_id UUID,
  p_action_type TEXT,
  p_performed_by UUID,
  p_performed_by_role TEXT,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.draft_audit_logs (
    order_id, action_type, performed_by, performed_by_role,
    previous_state, new_state, reason
  ) VALUES (
    p_order_id, p_action_type, p_performed_by, p_performed_by_role,
    p_previous_state, p_new_state, p_reason
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 5. Trigger to set draft expiration on creation
CREATE OR REPLACE FUNCTION public.set_draft_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expiration_hours INTEGER;
BEGIN
  -- Only set for new draft orders
  IF NEW.status = 'draft' AND OLD IS NULL THEN
    -- Get expiration hours from settings (default 48 hours)
    SELECT COALESCE(
      (SELECT setting_value::INTEGER FROM public.order_settings WHERE setting_key = 'draft_expiration_hours'),
      48
    ) INTO v_expiration_hours;
    
    NEW.draft_status := 'active';
    NEW.draft_expires_at := now() + (v_expiration_hours || ' hours')::INTERVAL;
    NEW.draft_version := 1;
    
    -- Log the creation
    PERFORM log_draft_action(
      NEW.id,
      'created',
      NEW.customer_id,
      'customer',
      NULL,
      jsonb_build_object(
        'amount', NEW.amount,
        'product_name', NEW.product_name,
        'merchant_id', NEW.merchant_id
      ),
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_draft_expiration ON public.orders;
CREATE TRIGGER trigger_set_draft_expiration
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'draft')
EXECUTE FUNCTION public.set_draft_expiration();

-- 6. Trigger to log draft edits
CREATE OR REPLACE FUNCTION public.log_draft_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log edits to active drafts
  IF OLD.status = 'draft' AND NEW.status = 'draft' AND OLD.draft_status = 'active' THEN
    -- Check if relevant fields changed
    IF OLD.amount != NEW.amount 
       OR OLD.product_name != NEW.product_name 
       OR OLD.product_description IS DISTINCT FROM NEW.product_description THEN
      
      -- Increment version
      NEW.draft_version := COALESCE(OLD.draft_version, 1) + 1;
      
      -- Log the edit
      PERFORM log_draft_action(
        NEW.id,
        'edited',
        auth.uid(),
        CASE 
          WHEN has_role(auth.uid(), 'admin') THEN 'admin'
          WHEN has_role(auth.uid(), 'merchant') THEN 'merchant'
          ELSE 'customer'
        END,
        jsonb_build_object(
          'amount', OLD.amount,
          'product_name', OLD.product_name,
          'product_description', OLD.product_description,
          'version', OLD.draft_version
        ),
        jsonb_build_object(
          'amount', NEW.amount,
          'product_name', NEW.product_name,
          'product_description', NEW.product_description,
          'version', NEW.draft_version
        ),
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_draft_edit ON public.orders;
CREATE TRIGGER trigger_log_draft_edit
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_draft_edit();

-- 7. Function to validate draft state transitions
CREATE OR REPLACE FUNCTION public.validate_draft_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only validate if draft_status is changing
  IF OLD.draft_status IS DISTINCT FROM NEW.draft_status THEN
    -- Valid transitions:
    -- active -> submitted, cancelled, deleted, expired
    -- submitted -> cancelled, change_requested, rejected (by merchant), to payment (status changes)
    -- change_requested -> active (customer re-edits), cancelled
    -- cancelled -> active (restore by customer within window)
    -- deleted -> active (restore by admin only)
    -- expired -> (no transitions, immutable)
    
    CASE OLD.draft_status
      WHEN 'active' THEN
        IF NEW.draft_status NOT IN ('submitted', 'cancelled', 'deleted', 'expired') THEN
          RAISE EXCEPTION 'Invalid draft transition: active -> %', NEW.draft_status;
        END IF;
        
      WHEN 'submitted' THEN
        IF NEW.draft_status NOT IN ('cancelled', 'change_requested', 'rejected') AND NEW.status = 'draft' THEN
          RAISE EXCEPTION 'Invalid draft transition: submitted -> %', NEW.draft_status;
        END IF;
        
      WHEN 'change_requested' THEN
        IF NEW.draft_status NOT IN ('active', 'cancelled') THEN
          RAISE EXCEPTION 'Invalid draft transition: change_requested -> %', NEW.draft_status;
        END IF;
        
      WHEN 'cancelled' THEN
        IF NEW.draft_status NOT IN ('active') THEN
          RAISE EXCEPTION 'Invalid draft transition: cancelled -> %', NEW.draft_status;
        END IF;
        
      WHEN 'deleted' THEN
        IF NOT has_role(auth.uid(), 'admin') THEN
          RAISE EXCEPTION 'Only admins can restore deleted drafts';
        END IF;
        IF NEW.draft_status != 'active' THEN
          RAISE EXCEPTION 'Deleted drafts can only be restored to active';
        END IF;
        
      WHEN 'expired' THEN
        RAISE EXCEPTION 'Expired drafts cannot transition to any other state';
        
      WHEN 'rejected' THEN
        -- Rejected drafts are immutable
        RAISE EXCEPTION 'Rejected drafts cannot transition to any other state';
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_draft_transition ON public.orders;
CREATE TRIGGER trigger_validate_draft_transition
BEFORE UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status = 'draft')
EXECUTE FUNCTION public.validate_draft_transition();

-- 8. Update RLS policy for draft updates
DROP POLICY IF EXISTS "Customers can update their own draft orders" ON public.orders;

CREATE POLICY "Customers can update their own draft orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = customer_id 
  AND status = 'draft'
  AND draft_status IN ('active', 'change_requested', 'cancelled')
)
WITH CHECK (
  auth.uid() = customer_id 
  AND status = 'draft'
);

-- Merchants can update draft status (reject, request changes)
CREATE POLICY "Merchants can update draft orders they receive"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = merchant_id 
  AND status = 'draft'
  AND draft_status = 'submitted'
  AND has_role(auth.uid(), 'merchant')
);

-- Admins can update all drafts
CREATE POLICY "Admins can update all draft orders"
ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin')
  AND status = 'draft'
);

-- 9. Prevent hard delete of drafts (soft delete only)
DROP POLICY IF EXISTS "Customers can delete their own draft orders" ON public.orders;

-- Only allow soft delete by updating draft_status
CREATE POLICY "Customers can soft delete their own draft orders"
ON public.orders
FOR DELETE
USING (
  auth.uid() = customer_id 
  AND status = 'draft'
  AND draft_status IN ('active', 'cancelled')
  AND has_role(auth.uid(), 'admin') -- Only admins can actually hard delete
);

-- 10. Add draft expiration setting if not exists
INSERT INTO public.order_settings (setting_key, setting_value, description)
VALUES ('draft_expiration_hours', '48', 'Hours until a draft automatically expires')
ON CONFLICT (setting_key) DO NOTHING;

-- 11. Create function to expire old drafts (called by cron/scheduled function)
CREATE OR REPLACE FUNCTION public.expire_old_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.orders
    SET 
      draft_status = 'expired',
      updated_at = now()
    WHERE status = 'draft'
      AND draft_status = 'active'
      AND draft_expires_at < now()
    RETURNING id, customer_id
  )
  SELECT COUNT(*) INTO v_count FROM expired;
  
  -- Log expirations
  INSERT INTO public.draft_audit_logs (order_id, action_type, performed_by, performed_by_role, reason)
  SELECT id, 'expired', customer_id, 'system', 'Draft expired due to timeout'
  FROM (
    SELECT id, customer_id FROM public.orders
    WHERE status = 'draft' AND draft_status = 'expired'
    AND updated_at > now() - INTERVAL '1 minute'
  ) recent_expirations;
  
  RETURN v_count;
END;
$$;

-- 12. Create function to check if draft can be restored
CREATE OR REPLACE FUNCTION public.can_restore_draft(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_restore_window_hours INTEGER;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get restore window from settings (default 24 hours)
  SELECT COALESCE(
    (SELECT setting_value::INTEGER FROM public.order_settings WHERE setting_key = 'draft_restore_window_hours'),
    24
  ) INTO v_restore_window_hours;
  
  -- Check if within restore window
  IF v_order.draft_status = 'cancelled' THEN
    RETURN v_order.draft_cancelled_at > now() - (v_restore_window_hours || ' hours')::INTERVAL;
  END IF;
  
  -- Only admins can restore deleted drafts
  IF v_order.draft_status = 'deleted' THEN
    RETURN has_role(auth.uid(), 'admin');
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Add restore window setting
INSERT INTO public.order_settings (setting_key, setting_value, description)
VALUES ('draft_restore_window_hours', '24', 'Hours within which a cancelled draft can be restored')
ON CONFLICT (setting_key) DO NOTHING;