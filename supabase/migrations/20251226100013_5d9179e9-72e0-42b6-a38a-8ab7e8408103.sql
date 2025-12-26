-- =============================================================================
-- WITHDRAWAL ABUSE RESISTANCE - DATABASE SECURITY FIX
-- =============================================================================

-- 1. Withdrawal Actions Log Table (immutable audit trail)
CREATE TABLE IF NOT EXISTS public.withdrawal_actions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  withdrawal_id UUID NOT NULL,
  withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('merchant_payout', 'customer_withdrawal')),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('merchant', 'customer')),
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  amount NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  gst NUMERIC DEFAULT 0,
  total_debit NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  bank_account_id UUID,
  bank_name TEXT,
  account_last4 TEXT,
  idempotency_key TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Immutability enforcement
CREATE OR REPLACE FUNCTION public.enforce_withdrawal_log_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Withdrawal action logs are immutable and cannot be modified or deleted';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prevent_withdrawal_log_modification ON public.withdrawal_actions_log;
CREATE TRIGGER prevent_withdrawal_log_modification
  BEFORE UPDATE OR DELETE ON public.withdrawal_actions_log
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_withdrawal_log_immutability();

-- Unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_actions_idempotency 
  ON public.withdrawal_actions_log(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_withdrawal_log_user 
  ON public.withdrawal_actions_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawal_log_withdrawal 
  ON public.withdrawal_actions_log(withdrawal_id, created_at DESC);

-- RLS policies for withdrawal_actions_log
ALTER TABLE public.withdrawal_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all withdrawal logs"
  ON public.withdrawal_actions_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert withdrawal logs"
  ON public.withdrawal_actions_log
  FOR INSERT
  WITH CHECK (true);

-- 2. Single concurrent withdrawal per user constraint
-- For merchant payouts: only one processing payout per merchant
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_payouts_single_active 
  ON public.merchant_payouts(merchant_id) 
  WHERE status IN ('processing', 'pending', 'initiated');

-- For customer withdrawals: only one pending withdrawal per customer  
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_single_pending_withdrawal
  ON public.wallet_transactions(customer_id)
  WHERE type = 'withdrawal' AND status IN ('pending', 'processing', 'initiated');

-- 3. Validation trigger for merchant payout creation
CREATE OR REPLACE FUNCTION public.validate_merchant_payout_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kyc_status TEXT;
  v_bank_verified BOOLEAN;
  v_active_disputes INTEGER;
  v_escrow_frozen BOOLEAN;
  v_merchant_status TEXT;
BEGIN
  -- 1. Check merchant KYC status
  SELECT status INTO v_kyc_status
  FROM public.merchant_kyc
  WHERE merchant_id = NEW.merchant_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_kyc_status IS NULL OR v_kyc_status != 'approved' THEN
    RAISE EXCEPTION 'KYC must be approved before withdrawing funds. Current status: %', COALESCE(v_kyc_status, 'not_started');
  END IF;
  
  -- 2. Check bank account verification
  SELECT is_verified INTO v_bank_verified
  FROM public.merchant_bank_accounts
  WHERE id = NEW.bank_account_id
    AND merchant_id = NEW.merchant_id;
  
  IF v_bank_verified IS NULL THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;
  
  IF NOT v_bank_verified THEN
    RAISE EXCEPTION 'Bank account must be verified before withdrawing funds';
  END IF;
  
  -- 3. Check for active disputes
  SELECT COUNT(*) INTO v_active_disputes
  FROM public.disputes d
  JOIN public.orders o ON o.id = d.order_id
  WHERE o.merchant_id = NEW.merchant_id
    AND d.status IN ('open', 'under_review', 'pending');
  
  IF v_active_disputes > 0 THEN
    RAISE EXCEPTION 'Cannot withdraw with % active dispute(s). Resolve all disputes first.', v_active_disputes;
  END IF;
  
  -- 4. Check escrow frozen status
  SELECT is_frozen INTO v_escrow_frozen
  FROM public.escrow_accounts
  WHERE merchant_id = NEW.merchant_id;
  
  IF v_escrow_frozen = true THEN
    RAISE EXCEPTION 'Cannot withdraw while escrow account is frozen';
  END IF;
  
  -- 5. Check merchant account status
  SELECT status INTO v_merchant_status
  FROM public.merchants
  WHERE user_id = NEW.merchant_id;
  
  IF v_merchant_status IN ('banned', 'suspended') THEN
    RAISE EXCEPTION 'Account is %. Cannot process withdrawals.', v_merchant_status;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_merchant_payout ON public.merchant_payouts;
CREATE TRIGGER validate_merchant_payout
  BEFORE INSERT ON public.merchant_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_merchant_payout_creation();

-- 4. Validation trigger for customer withdrawal creation
CREATE OR REPLACE FUNCTION public.validate_customer_withdrawal_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kyc_status TEXT;
  v_bank_verified TEXT;
  v_active_disputes INTEGER;
  v_wallet_balance NUMERIC;
BEGIN
  -- Only validate withdrawals
  IF NEW.type != 'withdrawal' THEN
    RETURN NEW;
  END IF;
  
  -- 1. Check customer KYC status
  SELECT status INTO v_kyc_status
  FROM public.kyc_records
  WHERE user_id = NEW.customer_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_kyc_status IS NULL OR v_kyc_status != 'approved' THEN
    RAISE EXCEPTION 'KYC must be approved before withdrawing funds. Current status: %', COALESCE(v_kyc_status, 'not_started');
  END IF;
  
  -- 2. Check bank account verification (if reference_id is a bank account)
  IF NEW.reference_type = 'bank_account' AND NEW.reference_id IS NOT NULL THEN
    SELECT verification_status INTO v_bank_verified
    FROM public.bank_accounts
    WHERE id = NEW.reference_id::uuid
      AND customer_id = NEW.customer_id;
    
    IF v_bank_verified IS NULL THEN
      RAISE EXCEPTION 'Bank account not found';
    END IF;
    
    IF v_bank_verified != 'verified' THEN
      RAISE EXCEPTION 'Bank account must be verified before withdrawing funds';
    END IF;
  END IF;
  
  -- 3. Check for active disputes
  SELECT COUNT(*) INTO v_active_disputes
  FROM public.disputes d
  WHERE d.customer_id = NEW.customer_id
    AND d.status IN ('open', 'under_review', 'pending');
  
  IF v_active_disputes > 0 THEN
    RAISE EXCEPTION 'Cannot withdraw with % active dispute(s). Resolve all disputes first.', v_active_disputes;
  END IF;
  
  -- 4. Validate balance from ledger
  SELECT COALESCE(
    SUM(CASE 
      WHEN type IN ('refund', 'credit') AND status = 'success' THEN amount
      WHEN type IN ('withdrawal', 'debit') AND status IN ('success', 'pending') THEN -amount
      ELSE 0
    END), 0
  ) INTO v_wallet_balance
  FROM public.wallet_transactions
  WHERE customer_id = NEW.customer_id
    AND id != NEW.id; -- Exclude current transaction
  
  IF NEW.amount > v_wallet_balance THEN
    RAISE EXCEPTION 'Insufficient balance. Available: ₹%. Requested: ₹%', v_wallet_balance, NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_customer_withdrawal ON public.wallet_transactions;
CREATE TRIGGER validate_customer_withdrawal
  BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_customer_withdrawal_creation();

-- 5. Prevent double withdrawal status updates (idempotency)
CREATE OR REPLACE FUNCTION public.prevent_double_withdrawal_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For merchant payouts
  IF TG_TABLE_NAME = 'merchant_payouts' THEN
    -- Cannot go from paid/completed to any other status
    IF OLD.status IN ('paid', 'completed') AND NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Payout already finalized with status: %. Cannot change.', OLD.status;
    END IF;
    
    -- Cannot process same payout twice
    IF OLD.status = 'processing' AND NEW.status = 'processing' THEN
      RETURN OLD; -- Idempotent - return existing
    END IF;
  END IF;
  
  -- For wallet transactions
  IF TG_TABLE_NAME = 'wallet_transactions' THEN
    IF OLD.type = 'withdrawal' THEN
      -- Cannot change from success/failed
      IF OLD.status = 'success' AND NEW.status != 'success' THEN
        RAISE EXCEPTION 'Withdrawal already succeeded. Cannot change status.';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_double_merchant_payout ON public.merchant_payouts;
CREATE TRIGGER prevent_double_merchant_payout
  BEFORE UPDATE ON public.merchant_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_double_withdrawal_processing();

DROP TRIGGER IF EXISTS prevent_double_customer_withdrawal ON public.wallet_transactions;
CREATE TRIGGER prevent_double_customer_withdrawal
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_double_withdrawal_processing();

-- 6. Add idempotency_key column to merchant_payouts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchant_payouts' 
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.merchant_payouts ADD COLUMN idempotency_key TEXT UNIQUE;
  END IF;
END $$;

-- 7. Add idempotency_key column to wallet_transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'wallet_transactions' 
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.wallet_transactions ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_idempotency 
  ON public.wallet_transactions(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 8. GST column for merchant payouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchant_payouts' 
    AND column_name = 'gst'
  ) THEN
    ALTER TABLE public.merchant_payouts ADD COLUMN gst NUMERIC DEFAULT 0;
  END IF;
END $$;

-- 9. Abuse tracking table
CREATE TABLE IF NOT EXISTS public.withdrawal_abuse_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('merchant', 'customer')),
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'double_submit', 
    'retry_after_failure', 
    'dispute_withdrawal_attempt',
    'insufficient_balance_attempt',
    'unverified_kyc_attempt',
    'unverified_bank_attempt',
    'frozen_account_attempt',
    'rate_limit_exceeded'
  )),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abuse_signals_user ON public.withdrawal_abuse_signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_signals_type ON public.withdrawal_abuse_signals(signal_type, created_at DESC);

ALTER TABLE public.withdrawal_abuse_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all abuse signals"
  ON public.withdrawal_abuse_signals
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert abuse signals"
  ON public.withdrawal_abuse_signals
  FOR INSERT
  WITH CHECK (true);

-- 10. Function to check withdrawal rate limiting
CREATE OR REPLACE FUNCTION public.check_withdrawal_rate_limit(
  p_user_id UUID,
  p_user_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_attempts INTEGER;
BEGIN
  -- Check withdrawals in last 24 hours
  IF p_user_type = 'merchant' THEN
    SELECT COUNT(*) INTO v_recent_attempts
    FROM public.merchant_payouts
    WHERE merchant_id = p_user_id
      AND created_at > now() - interval '24 hours';
  ELSE
    SELECT COUNT(*) INTO v_recent_attempts
    FROM public.wallet_transactions
    WHERE customer_id = p_user_id
      AND type = 'withdrawal'
      AND created_at > now() - interval '24 hours';
  END IF;
  
  -- Max 5 withdrawal attempts per 24 hours
  IF v_recent_attempts >= 5 THEN
    -- Log abuse signal
    INSERT INTO public.withdrawal_abuse_signals (user_id, user_type, signal_type, details)
    VALUES (p_user_id, p_user_type, 'rate_limit_exceeded', 
      jsonb_build_object('attempts_24h', v_recent_attempts));
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;