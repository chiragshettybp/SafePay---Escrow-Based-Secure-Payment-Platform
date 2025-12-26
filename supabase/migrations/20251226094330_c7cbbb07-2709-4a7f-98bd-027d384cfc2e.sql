
-- =====================================================
-- ESCROW RESOLUTION VERIFICATION FIX
-- ZERO FINANCIAL TOLERANCE - PRODUCTION ONLY
-- =====================================================
-- Addresses:
-- 1. Mutual exclusivity (release XOR refund, never both)
-- 2. Idempotency (prevent double resolution)
-- 3. Finalization flag enforcement
-- 4. Audit trail with all required fields
-- 5. Database-level atomicity guarantees

-- =====================================================
-- 1. ADD ESCROW FINALIZATION TRACKING
-- =====================================================

-- Add resolution_type and is_finalized to orders for strict tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS escrow_resolution_type TEXT CHECK (escrow_resolution_type IN ('released', 'refunded', NULL)),
ADD COLUMN IF NOT EXISTS escrow_finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escrow_finalized_by UUID;

-- Create unique partial index: only ONE debit transaction per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_transactions_unique_debit_per_order 
ON public.escrow_transactions (order_id, transaction_type) 
WHERE transaction_type = 'debit';

-- =====================================================
-- 2. ESCROW RESOLUTION AUDIT TABLE
-- =====================================================

-- Create dedicated escrow resolution audit table
CREATE TABLE IF NOT EXISTS public.escrow_resolution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  escrow_account_id UUID REFERENCES public.escrow_accounts(id),
  resolution_type TEXT NOT NULL CHECK (resolution_type IN ('released', 'refunded', 'force_released', 'force_refunded')),
  previous_order_status TEXT NOT NULL,
  new_order_status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  approval_source TEXT NOT NULL CHECK (approval_source IN ('customer', 'admin', 'auto', 'dispute_resolution')),
  admin_id UUID,
  reason TEXT NOT NULL,
  ip_address TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for escrow resolution log (append-only, admin view only)
ALTER TABLE public.escrow_resolution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view escrow resolution log"
ON public.escrow_resolution_log FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert escrow resolution log"
ON public.escrow_resolution_log FOR INSERT
WITH CHECK (true);

-- Prevent updates and deletes (immutable)
CREATE OR REPLACE FUNCTION public.prevent_resolution_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Escrow resolution log is immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_resolution_log_immutable ON public.escrow_resolution_log;
CREATE TRIGGER trigger_resolution_log_immutable
  BEFORE UPDATE OR DELETE ON public.escrow_resolution_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resolution_log_modification();

-- =====================================================
-- 3. MUTUAL EXCLUSIVITY ENFORCEMENT
-- =====================================================

-- Create function to enforce mutual exclusivity on escrow resolution
CREATE OR REPLACE FUNCTION public.enforce_escrow_mutual_exclusivity()
RETURNS TRIGGER AS $$
DECLARE
  existing_resolution TEXT;
  existing_finalized_at TIMESTAMPTZ;
BEGIN
  -- When order status changes to completed or refunded
  IF (NEW.status = 'completed' OR NEW.status = 'refunded') AND 
     (OLD.status != 'completed' AND OLD.status != 'refunded') THEN
    
    -- Check if already finalized
    IF OLD.escrow_resolution_type IS NOT NULL AND OLD.escrow_finalized_at IS NOT NULL THEN
      RAISE EXCEPTION 'ESCROW_ALREADY_FINALIZED: Order % escrow was already % at %. Cannot change to %.', 
        NEW.id, 
        OLD.escrow_resolution_type, 
        OLD.escrow_finalized_at,
        NEW.status;
    END IF;
    
    -- Set resolution type and finalization timestamp
    IF NEW.status = 'completed' THEN
      NEW.escrow_resolution_type := 'released';
    ELSIF NEW.status = 'refunded' THEN
      NEW.escrow_resolution_type := 'refunded';
    END IF;
    
    NEW.escrow_finalized_at := now();
    NEW.escrow_finalized_by := auth.uid();
  END IF;
  
  -- CRITICAL: Prevent changing from completed to refunded or vice versa
  IF OLD.status = 'completed' AND NEW.status = 'refunded' THEN
    RAISE EXCEPTION 'MUTUAL_EXCLUSIVITY_VIOLATION: Cannot refund an order that was already released. Order: %', NEW.id;
  END IF;
  
  IF OLD.status = 'refunded' AND NEW.status = 'completed' THEN
    RAISE EXCEPTION 'MUTUAL_EXCLUSIVITY_VIOLATION: Cannot release an order that was already refunded. Order: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_escrow_mutual_exclusivity ON public.orders;
CREATE TRIGGER trigger_enforce_escrow_mutual_exclusivity
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_escrow_mutual_exclusivity();

-- =====================================================
-- 4. PREVENT DUPLICATE DEBIT TRANSACTIONS
-- =====================================================

-- Create function to prevent duplicate escrow debits
CREATE OR REPLACE FUNCTION public.prevent_duplicate_escrow_debit()
RETURNS TRIGGER AS $$
DECLARE
  existing_debit_count INTEGER;
BEGIN
  IF NEW.transaction_type = 'debit' THEN
    SELECT COUNT(*) INTO existing_debit_count
    FROM public.escrow_transactions
    WHERE order_id = NEW.order_id 
    AND transaction_type = 'debit';
    
    IF existing_debit_count > 0 THEN
      RAISE EXCEPTION 'DUPLICATE_ESCROW_DEBIT: A debit transaction already exists for order %. Idempotency check failed.', NEW.order_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_prevent_duplicate_escrow_debit ON public.escrow_transactions;
CREATE TRIGGER trigger_prevent_duplicate_escrow_debit
  BEFORE INSERT ON public.escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_escrow_debit();

-- =====================================================
-- 5. VALIDATE ESCROW STATE BEFORE MODIFICATION
-- =====================================================

-- Create function to validate escrow account state before balance changes
CREATE OR REPLACE FUNCTION public.validate_escrow_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent negative balances
  IF NEW.locked_balance < 0 THEN
    RAISE EXCEPTION 'INVALID_ESCROW_STATE: locked_balance cannot be negative. Current: %, Attempted: %', 
      OLD.locked_balance, NEW.locked_balance;
  END IF;
  
  IF NEW.total_balance < 0 THEN
    RAISE EXCEPTION 'INVALID_ESCROW_STATE: total_balance cannot be negative. Current: %, Attempted: %', 
      OLD.total_balance, NEW.total_balance;
  END IF;
  
  IF NEW.available_balance < 0 THEN
    RAISE EXCEPTION 'INVALID_ESCROW_STATE: available_balance cannot be negative. Current: %, Attempted: %', 
      OLD.available_balance, NEW.available_balance;
  END IF;
  
  -- Prevent updates if account is frozen (except by admin)
  IF OLD.is_frozen = true AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'ESCROW_FROZEN: Cannot modify frozen escrow account %. Admin intervention required.', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_validate_escrow_balance ON public.escrow_accounts;
CREATE TRIGGER trigger_validate_escrow_balance
  BEFORE UPDATE ON public.escrow_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_escrow_balance_change();

-- =====================================================
-- 6. PAYMENT STATUS MUTUAL EXCLUSIVITY
-- =====================================================

-- Add constraint to payment status
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;

-- Create function to enforce payment finality
CREATE OR REPLACE FUNCTION public.enforce_payment_finality()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment becomes released or refunded, mark as final
  IF NEW.status IN ('released', 'refunded') AND OLD.status NOT IN ('released', 'refunded') THEN
    NEW.is_final := true;
  END IF;
  
  -- Prevent changing a finalized payment
  IF OLD.is_final = true AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_FINAL: Payment % status is % and cannot be changed. Was finalized.', 
      NEW.id, OLD.status;
  END IF;
  
  -- Prevent switching between released and refunded
  IF OLD.status = 'released' AND NEW.status = 'refunded' THEN
    RAISE EXCEPTION 'MUTUAL_EXCLUSIVITY_VIOLATION: Cannot refund a released payment %', NEW.id;
  END IF;
  
  IF OLD.status = 'refunded' AND NEW.status = 'released' THEN
    RAISE EXCEPTION 'MUTUAL_EXCLUSIVITY_VIOLATION: Cannot release a refunded payment %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_payment_finality ON public.payments;
CREATE TRIGGER trigger_enforce_payment_finality
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_finality();

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_escrow_resolution ON public.orders(escrow_resolution_type, escrow_finalized_at);
CREATE INDEX IF NOT EXISTS idx_escrow_resolution_log_order ON public.escrow_resolution_log(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_resolution_log_admin ON public.escrow_resolution_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_payments_is_final ON public.payments(is_final);

-- =====================================================
-- 8. BACKFILL EXISTING COMPLETED/REFUNDED ORDERS
-- =====================================================

-- Set resolution type for existing finalized orders
UPDATE public.orders 
SET escrow_resolution_type = 'released',
    escrow_finalized_at = COALESCE(completed_at, updated_at)
WHERE status = 'completed' 
  AND escrow_resolution_type IS NULL;

UPDATE public.orders 
SET escrow_resolution_type = 'refunded',
    escrow_finalized_at = updated_at
WHERE status = 'refunded' 
  AND escrow_resolution_type IS NULL;

-- Set is_final for existing finalized payments
UPDATE public.payments
SET is_final = true
WHERE status IN ('released', 'refunded')
  AND is_final IS NOT TRUE;
