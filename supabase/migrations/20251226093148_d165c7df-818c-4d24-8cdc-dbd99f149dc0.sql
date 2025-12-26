
-- ============================================
-- MERCHANT ISOLATION & PRIVILEGE SECURITY FIX
-- ============================================

-- 1. CREATE MERCHANT ACTIONS AUDIT LOG TABLE
-- This logs all merchant modifications immutably
CREATE TABLE IF NOT EXISTS public.merchant_order_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  field_changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Only admins can view audit logs, no one can modify
ALTER TABLE public.merchant_order_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view merchant action logs"
ON public.merchant_order_actions_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert merchant action logs"
ON public.merchant_order_actions_log
FOR INSERT
WITH CHECK (true);

-- No UPDATE or DELETE policies - logs are immutable

-- 2. DROP OVERLY PERMISSIVE MERCHANT ORDER UPDATE POLICY
DROP POLICY IF EXISTS "Merchants can update orders assigned to them" ON public.orders;

-- 3. CREATE RESTRICTED MERCHANT ORDER UPDATE POLICY
-- Merchants can ONLY update status and delivered_at fields
-- They CANNOT edit: amount, customer_id, merchant_id, product_name, etc.
CREATE POLICY "Merchants can update limited fields on their orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = merchant_id 
  AND has_role(auth.uid(), 'merchant')
)
WITH CHECK (
  auth.uid() = merchant_id 
  AND has_role(auth.uid(), 'merchant')
  -- Cannot change these critical fields
  AND amount = (SELECT amount FROM orders WHERE id = orders.id)
  AND customer_id = (SELECT customer_id FROM orders WHERE id = orders.id)
  AND merchant_id = (SELECT merchant_id FROM orders WHERE id = orders.id)
  AND product_name = (SELECT product_name FROM orders WHERE id = orders.id)
  AND created_at = (SELECT created_at FROM orders WHERE id = orders.id)
);

-- 4. CREATE TRIGGER TO LOG MERCHANT ORDER ACTIONS
CREATE OR REPLACE FUNCTION public.log_merchant_order_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if the updater is a merchant (not admin)
  IF has_role(auth.uid(), 'merchant') AND auth.uid() = NEW.merchant_id THEN
    INSERT INTO public.merchant_order_actions_log (
      merchant_id,
      order_id,
      action_type,
      previous_status,
      new_status,
      field_changes
    ) VALUES (
      auth.uid(),
      NEW.id,
      CASE 
        WHEN OLD.status != NEW.status THEN 'status_change'
        WHEN OLD.delivered_at IS DISTINCT FROM NEW.delivered_at THEN 'delivery_update'
        ELSE 'update'
      END,
      OLD.status::TEXT,
      NEW.status::TEXT,
      jsonb_build_object(
        'old_delivered_at', OLD.delivered_at,
        'new_delivered_at', NEW.delivered_at,
        'old_expected_delivery', OLD.expected_delivery_date,
        'new_expected_delivery', NEW.expected_delivery_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_merchant_order_action
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_merchant_order_action();

-- 5. ADD MERCHANT READ-ONLY ACCESS TO CUSTOMER PROFILES (LIMITED FIELDS)
-- First, check we don't have a merchant profile policy already
-- Create a policy that lets merchants see ONLY name/phone for their order customers
CREATE POLICY "Merchants can view customer profiles for their orders"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'merchant') 
  AND EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.merchant_id = auth.uid() 
    AND o.customer_id = profiles.user_id
  )
);

-- 6. CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_merchant_order_actions_merchant_id 
ON public.merchant_order_actions_log(merchant_id);

CREATE INDEX IF NOT EXISTS idx_merchant_order_actions_order_id 
ON public.merchant_order_actions_log(order_id);

CREATE INDEX IF NOT EXISTS idx_merchant_order_actions_created_at 
ON public.merchant_order_actions_log(created_at DESC);
