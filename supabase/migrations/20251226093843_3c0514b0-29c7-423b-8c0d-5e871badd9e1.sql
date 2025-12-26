
-- =====================================================
-- DELIVERY AUTHENTICITY & ESCROW DEPENDENCY SECURITY FIX
-- =====================================================
-- Addresses:
-- 1. Shipment cannot exist before escrow lock (database enforcement)
-- 2. Delivery proofs immutable after creation
-- 3. Tracking records immutable after delivery confirmation
-- 4. Server-generated timestamps enforcement
-- 5. Prevent fake shipment creation via database constraint

-- =====================================================
-- 1. TRACKING TABLE CONSTRAINTS & TRIGGERS
-- =====================================================

-- Create function to validate tracking creation ONLY for escrow-locked orders
CREATE OR REPLACE FUNCTION public.validate_tracking_creation()
RETURNS TRIGGER AS $$
DECLARE
  order_status TEXT;
  payment_exists BOOLEAN;
BEGIN
  -- Get order status
  SELECT o.status INTO order_status
  FROM orders o
  WHERE o.id = NEW.order_id;
  
  IF order_status IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', NEW.order_id;
  END IF;
  
  -- Only allow tracking creation for orders with escrow locked or in progress
  IF order_status NOT IN ('escrow_locked', 'in_progress') THEN
    RAISE EXCEPTION 'Cannot create shipment for order with status: %. Order must have payment locked in escrow first.', order_status;
  END IF;
  
  -- Verify payment exists for this order
  SELECT EXISTS(
    SELECT 1 FROM payments p 
    WHERE p.order_id = NEW.order_id 
    AND p.status IN ('escrow', 'released')
  ) INTO payment_exists;
  
  IF NOT payment_exists THEN
    RAISE EXCEPTION 'Cannot create shipment without confirmed payment for order: %', NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to validate tracking before insert
DROP TRIGGER IF EXISTS trigger_validate_tracking_creation ON public.tracking;
CREATE TRIGGER trigger_validate_tracking_creation
  BEFORE INSERT ON public.tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tracking_creation();

-- =====================================================
-- 2. PREVENT TRACKING DELETION (IMMUTABILITY)
-- =====================================================

-- Create function to prevent tracking deletion
CREATE OR REPLACE FUNCTION public.prevent_tracking_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only admins can delete tracking (via service role)
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Tracking records cannot be deleted. Contact support if correction needed.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_prevent_tracking_deletion ON public.tracking;
CREATE TRIGGER trigger_prevent_tracking_deletion
  BEFORE DELETE ON public.tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tracking_deletion();

-- =====================================================
-- 3. RESTRICT TRACKING UPDATES AFTER DELIVERY
-- =====================================================

-- Create function to restrict tracking updates after delivery confirmed
CREATE OR REPLACE FUNCTION public.restrict_tracking_after_delivery()
RETURNS TRIGGER AS $$
DECLARE
  order_status TEXT;
BEGIN
  -- Get order status
  SELECT o.status INTO order_status
  FROM orders o
  WHERE o.id = OLD.order_id;
  
  -- If order is completed or refunded, tracking is immutable (except for admins)
  IF order_status IN ('completed', 'refunded') THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Cannot modify tracking after order is completed. Record is immutable.';
    END IF;
  END IF;
  
  -- Prevent changing order_id (shipment hijacking)
  IF NEW.order_id <> OLD.order_id THEN
    RAISE EXCEPTION 'Cannot change the order associated with a shipment.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_restrict_tracking_update ON public.tracking;
CREATE TRIGGER trigger_restrict_tracking_update
  BEFORE UPDATE ON public.tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_tracking_after_delivery();

-- =====================================================
-- 4. DELIVERY PROOFS IMMUTABILITY
-- =====================================================

-- Prevent updates to delivery_proofs (append-only)
CREATE OR REPLACE FUNCTION public.prevent_delivery_proof_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Delivery proofs cannot be modified after upload. Create a new proof if needed.';
  ELSIF TG_OP = 'DELETE' THEN
    -- Only admins can delete
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Delivery proofs cannot be deleted. Contact support if correction needed.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_delivery_proof_immutable ON public.delivery_proofs;
CREATE TRIGGER trigger_delivery_proof_immutable
  BEFORE UPDATE OR DELETE ON public.delivery_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delivery_proof_modification();

-- =====================================================
-- 5. SERVER-ENFORCED TIMESTAMPS FOR DELIVERY
-- =====================================================

-- Ensure delivered_at is server-generated, not client-settable
CREATE OR REPLACE FUNCTION public.enforce_delivery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'delivered', set delivered_at to server time
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered') THEN
    NEW.delivered_at := now();
  END IF;
  
  -- Prevent backdating delivered_at (must be within 5 minutes of now)
  IF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
    IF NEW.delivered_at < (now() - interval '5 minutes') THEN
      NEW.delivered_at := now(); -- Force to current time if backdated
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_delivery_timestamp ON public.orders;
CREATE TRIGGER trigger_enforce_delivery_timestamp
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_delivery_timestamp();

-- =====================================================
-- 6. TRACKING EVENTS IMMUTABILITY
-- =====================================================

-- Prevent updates/deletes to tracking_events (append-only audit trail)
CREATE OR REPLACE FUNCTION public.tracking_events_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Tracking events are immutable and cannot be modified.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Tracking events cannot be deleted.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_tracking_events_immutable ON public.tracking_events;
CREATE TRIGGER trigger_tracking_events_immutable
  BEFORE UPDATE OR DELETE ON public.tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION public.tracking_events_immutable();

-- =====================================================
-- 7. UNIQUE CONSTRAINT: ONE SHIPMENT PER ORDER
-- =====================================================

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tracking_order_id_unique'
  ) THEN
    ALTER TABLE public.tracking 
    ADD CONSTRAINT tracking_order_id_unique UNIQUE (order_id);
  END IF;
END $$;

-- =====================================================
-- 8. UPDATE RLS POLICIES FOR TRACKING
-- =====================================================

-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Merchants can view and update tracking for their orders" ON public.tracking;

-- Create separate SELECT policy
CREATE POLICY "Merchants can view tracking for their orders"
ON public.tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = tracking.order_id 
    AND o.merchant_id = auth.uid()
  )
  AND has_role(auth.uid(), 'merchant')
);

-- Create INSERT policy (controlled by trigger for escrow validation)
CREATE POLICY "Merchants can create tracking for their paid orders"
ON public.tracking
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = tracking.order_id 
    AND o.merchant_id = auth.uid()
    AND o.status IN ('escrow_locked', 'in_progress')
  )
  AND has_role(auth.uid(), 'merchant')
);

-- Create UPDATE policy (controlled by trigger for immutability)
CREATE POLICY "Merchants can update tracking before completion"
ON public.tracking
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = tracking.order_id 
    AND o.merchant_id = auth.uid()
    AND o.status NOT IN ('completed', 'refunded')
  )
  AND has_role(auth.uid(), 'merchant')
);

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tracking_order_status ON public.tracking(order_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_proofs_order ON public.delivery_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking ON public.tracking_events(tracking_id);
