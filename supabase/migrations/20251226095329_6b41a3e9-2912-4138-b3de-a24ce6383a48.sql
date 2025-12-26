-- ============================================================================
-- LEDGER-DERIVED WALLET SECURITY FIX
-- Enforces: Immutable ledger, computed balances, audit trail
-- ============================================================================

-- =============================================================================
-- 1. MAKE WALLET_TRANSACTIONS IMMUTABLE (NO UPDATE/DELETE)
-- =============================================================================

-- Prevent any modification to wallet transactions (ledger entries)
CREATE OR REPLACE FUNCTION public.enforce_wallet_transaction_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'LEDGER_IMMUTABLE: Wallet transactions cannot be modified. Transaction ID: %. Create a reversal entry instead.', OLD.id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only allow admin deletion (for extreme cases like legal requirements)
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'LEDGER_IMMUTABLE: Wallet transactions cannot be deleted. Admin intervention required. Transaction ID: %', OLD.id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

-- Create trigger for wallet_transactions immutability
DROP TRIGGER IF EXISTS trigger_wallet_transactions_immutable ON public.wallet_transactions;
CREATE TRIGGER trigger_wallet_transactions_immutable
  BEFORE UPDATE OR DELETE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_wallet_transaction_immutability();

-- =============================================================================
-- 2. CREATE FUNCTION TO COMPUTE WALLET BALANCE FROM LEDGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.compute_wallet_balance(p_customer_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  computed_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('refund', 'credit', 'reversal_credit') AND status = 'success' THEN amount
      WHEN type IN ('withdrawal', 'debit', 'reversal_debit') AND status IN ('success', 'pending') THEN -amount
      ELSE 0
    END
  ), 0)
  INTO computed_balance
  FROM public.wallet_transactions
  WHERE customer_id = p_customer_id;
  
  RETURN computed_balance;
END;
$$;

-- =============================================================================
-- 3. CREATE TRIGGER TO AUTO-SYNC WALLET BALANCE FROM LEDGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_wallet_balance_from_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  computed_balance NUMERIC;
  wallet_id UUID;
BEGIN
  -- Get the customer's wallet
  SELECT id INTO wallet_id
  FROM public.wallets
  WHERE customer_id = NEW.customer_id;
  
  IF wallet_id IS NOT NULL THEN
    -- Compute balance from ledger
    computed_balance := compute_wallet_balance(NEW.customer_id);
    
    -- Update wallet with computed balance
    UPDATE public.wallets
    SET 
      balance = computed_balance,
      updated_at = now()
    WHERE id = wallet_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync wallet balance after every transaction
DROP TRIGGER IF EXISTS trigger_sync_wallet_balance ON public.wallet_transactions;
CREATE TRIGGER trigger_sync_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_wallet_balance_from_ledger();

-- =============================================================================
-- 4. CREATE CONSISTENCY CHECK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_wallet_ledger_consistency(p_customer_id UUID)
RETURNS TABLE (
  wallet_balance NUMERIC,
  ledger_balance NUMERIC,
  is_consistent BOOLEAN,
  discrepancy NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_balance NUMERIC;
  v_ledger_balance NUMERIC;
BEGIN
  -- Get stored wallet balance
  SELECT COALESCE(balance, 0) INTO v_wallet_balance
  FROM public.wallets
  WHERE customer_id = p_customer_id;
  
  -- Compute balance from ledger
  v_ledger_balance := compute_wallet_balance(p_customer_id);
  
  RETURN QUERY SELECT 
    v_wallet_balance,
    v_ledger_balance,
    v_wallet_balance = v_ledger_balance,
    v_wallet_balance - v_ledger_balance;
END;
$$;

-- =============================================================================
-- 5. CREATE MERCHANT WALLET LEDGER TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.merchant_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  transaction_type TEXT NOT NULL, -- 'escrow_credit', 'escrow_release', 'withdrawal', 'admin_credit', 'admin_debit', 'fee', 'reversal'
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'pending', 'failed'
  reference_type TEXT, -- 'order', 'payout', 'admin_action', 'dispute'
  reference_id UUID,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT merchant_wallet_transactions_positive_amount CHECK (amount >= 0)
);

-- Enable RLS
ALTER TABLE public.merchant_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own transactions"
  ON public.merchant_wallet_transactions
  FOR SELECT
  USING (merchant_id = auth.uid() AND has_role(auth.uid(), 'merchant'));

CREATE POLICY "Admins can view all merchant transactions"
  ON public.merchant_wallet_transactions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert merchant transactions"
  ON public.merchant_wallet_transactions
  FOR INSERT
  WITH CHECK (true);

-- Make merchant wallet transactions immutable
CREATE OR REPLACE FUNCTION public.enforce_merchant_wallet_transaction_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'LEDGER_IMMUTABLE: Merchant wallet transactions cannot be modified. Transaction ID: %. Create a reversal entry instead.', OLD.id;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'LEDGER_IMMUTABLE: Merchant wallet transactions cannot be deleted. Admin intervention required. Transaction ID: %', OLD.id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_merchant_wallet_transactions_immutable
  BEFORE UPDATE OR DELETE ON public.merchant_wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_merchant_wallet_transaction_immutability();

-- =============================================================================
-- 6. COMPUTE MERCHANT WALLET BALANCES FROM LEDGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.compute_merchant_wallet_balances(p_merchant_id UUID)
RETURNS TABLE (
  available_balance NUMERIC,
  pending_balance NUMERIC,
  total_paid_out NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE 
      WHEN transaction_type IN ('escrow_release', 'admin_credit', 'reversal_credit') AND status = 'success' THEN amount
      WHEN transaction_type IN ('withdrawal', 'admin_debit', 'reversal_debit') AND status IN ('success', 'pending') THEN -amount
      WHEN transaction_type = 'fee' AND status = 'success' THEN -amount
      ELSE 0
    END), 0) AS available_balance,
    COALESCE(SUM(CASE 
      WHEN transaction_type = 'escrow_credit' AND status = 'success' THEN amount
      WHEN transaction_type = 'escrow_release' AND status = 'success' THEN -amount
      ELSE 0
    END), 0) AS pending_balance,
    COALESCE(SUM(CASE 
      WHEN transaction_type = 'withdrawal' AND status = 'success' THEN amount
      ELSE 0
    END), 0) AS total_paid_out
  FROM public.merchant_wallet_transactions
  WHERE merchant_id = p_merchant_id;
END;
$$;

-- =============================================================================
-- 7. SYNC MERCHANT WALLET FROM LEDGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_merchant_wallet_from_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available NUMERIC;
  v_pending NUMERIC;
  v_paid_out NUMERIC;
BEGIN
  -- Compute balances from ledger
  SELECT available_balance, pending_balance, total_paid_out
  INTO v_available, v_pending, v_paid_out
  FROM compute_merchant_wallet_balances(NEW.merchant_id);
  
  -- Update merchant wallet with computed balances
  UPDATE public.merchant_wallets
  SET 
    available_balance = v_available,
    pending_balance = v_pending,
    total_paid_out = v_paid_out,
    updated_at = now()
  WHERE merchant_id = NEW.merchant_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_merchant_wallet
  AFTER INSERT ON public.merchant_wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_merchant_wallet_from_ledger();

-- =============================================================================
-- 8. PREVENT DIRECT WALLET BALANCE UPDATES (EXCEPT VIA TRIGGER)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_direct_wallet_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_context TEXT;
BEGIN
  -- Allow updates from our sync triggers (identified by session context)
  IF current_setting('wallet.sync_in_progress', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Allow if balance hasn't changed (non-balance updates are OK)
  IF NEW.balance = OLD.balance THEN
    RETURN NEW;
  END IF;
  
  -- Check if there's a corresponding new ledger entry (for atomic operations)
  -- This allows the sync trigger to work but blocks direct balance manipulation
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE customer_id = NEW.customer_id
    AND created_at > OLD.updated_at - INTERVAL '5 seconds'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Block direct balance manipulation
  RAISE EXCEPTION 'DIRECT_BALANCE_VIOLATION: Wallet balance cannot be updated directly. All balance changes must go through wallet_transactions ledger. Customer ID: %', NEW.customer_id;
END;
$$;

-- Note: We'll add this trigger after refactoring the code to use ledger entries
-- DROP TRIGGER IF EXISTS trigger_prevent_direct_wallet_update ON public.wallets;
-- CREATE TRIGGER trigger_prevent_direct_wallet_update
--   BEFORE UPDATE ON public.wallets
--   FOR EACH ROW
--   EXECUTE FUNCTION prevent_direct_wallet_update();

-- =============================================================================
-- 9. BLOCK DIRECT MERCHANT WALLET BALANCE UPDATES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_direct_merchant_wallet_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if balances haven't changed
  IF NEW.available_balance = OLD.available_balance 
     AND NEW.pending_balance = OLD.pending_balance 
     AND NEW.total_paid_out = OLD.total_paid_out THEN
    RETURN NEW;
  END IF;
  
  -- Check if there's a corresponding new ledger entry
  IF EXISTS (
    SELECT 1 FROM public.merchant_wallet_transactions
    WHERE merchant_id = NEW.merchant_id
    AND created_at > OLD.updated_at - INTERVAL '5 seconds'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Block direct balance manipulation
  RAISE EXCEPTION 'DIRECT_BALANCE_VIOLATION: Merchant wallet balances cannot be updated directly. All balance changes must go through merchant_wallet_transactions ledger. Merchant ID: %', NEW.merchant_id;
END;
$$;

-- Note: Adding after edge function refactoring
-- DROP TRIGGER IF EXISTS trigger_prevent_direct_merchant_wallet_update ON public.merchant_wallets;
-- CREATE TRIGGER trigger_prevent_direct_merchant_wallet_update
--   BEFORE UPDATE ON public.merchant_wallets
--   FOR EACH ROW
--   EXECUTE FUNCTION prevent_direct_merchant_wallet_update();

-- =============================================================================
-- 10. INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer_type_status 
  ON public.wallet_transactions (customer_id, type, status);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer_created
  ON public.wallet_transactions (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_wallet_transactions_merchant
  ON public.merchant_wallet_transactions (merchant_id);

CREATE INDEX IF NOT EXISTS idx_merchant_wallet_transactions_merchant_type
  ON public.merchant_wallet_transactions (merchant_id, transaction_type, status);

CREATE INDEX IF NOT EXISTS idx_merchant_wallet_transactions_reference
  ON public.merchant_wallet_transactions (reference_type, reference_id);

-- =============================================================================
-- 11. DROP DANGEROUS UPDATE POLICIES
-- =============================================================================

-- Remove customer ability to update wallet transactions (ledger must be immutable)
DROP POLICY IF EXISTS "Customers can update their own transactions" ON public.wallet_transactions;

-- Remove merchant ability to directly update wallet
DROP POLICY IF EXISTS "Merchants can update their own wallet" ON public.merchant_wallets;