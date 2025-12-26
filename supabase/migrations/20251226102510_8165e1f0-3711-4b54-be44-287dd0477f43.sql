-- ============================================================
-- MERCHANT WALLET REBUILD: LEDGER-FIRST ARCHITECTURE
-- ============================================================
-- This migration implements a fully ledger-based money system
-- where balances are CALCULATED from the transaction ledger,
-- never stored as mutable values.
-- ============================================================

-- Add platform fee columns to merchant_payouts if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_payouts' AND column_name = 'platform_fee') THEN
    ALTER TABLE public.merchant_payouts ADD COLUMN platform_fee NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_payouts' AND column_name = 'withdrawal_fee') THEN
    ALTER TABLE public.merchant_payouts ADD COLUMN withdrawal_fee NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Add escrow_fee columns to orders table for tracking platform fees
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'platform_fee') THEN
    ALTER TABLE public.orders ADD COLUMN platform_fee NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'platform_fee_gst') THEN
    ALTER TABLE public.orders ADD COLUMN platform_fee_gst NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'merchant_net_amount') THEN
    ALTER TABLE public.orders ADD COLUMN merchant_net_amount NUMERIC;
  END IF;
END $$;

-- Add entry_type column to merchant_wallet_transactions for more granular tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_wallet_transactions' AND column_name = 'entry_type') THEN
    ALTER TABLE public.merchant_wallet_transactions ADD COLUMN entry_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_wallet_transactions' AND column_name = 'currency') THEN
    ALTER TABLE public.merchant_wallet_transactions ADD COLUMN currency TEXT DEFAULT 'INR';
  END IF;
END $$;

-- Create a function to compute merchant wallet balances from ledger ONLY
CREATE OR REPLACE FUNCTION public.compute_merchant_balance_from_ledger(p_merchant_id UUID)
RETURNS TABLE (
  total_credits NUMERIC,
  total_debits NUMERIC,
  current_balance NUMERIC,
  frozen_amount NUMERIC,
  available_balance NUMERIC,
  total_withdrawn NUMERIC,
  pending_releases NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_credits NUMERIC;
  v_total_debits NUMERIC;
  v_frozen_amount NUMERIC;
  v_pending_releases NUMERIC;
BEGIN
  -- TOTAL_CREDITS: Sum of all positive entries (escrow_release, credit, reversal_credit)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_credits
  FROM public.merchant_wallet_transactions
  WHERE merchant_id = p_merchant_id
    AND status = 'success'
    AND transaction_type IN ('escrow_release', 'admin_credit', 'reversal_credit', 'withdrawal_reversal');

  -- TOTAL_DEBITS: Sum of all negative entries (withdrawal, fee, gst, admin_debit)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_debits
  FROM public.merchant_wallet_transactions
  WHERE merchant_id = p_merchant_id
    AND status IN ('success', 'pending')
    AND transaction_type IN ('withdrawal', 'fee', 'gst', 'admin_debit', 'platform_fee', 'dispute_debit');

  -- FROZEN_AMOUNT: Funds locked for pending withdrawals or disputed orders
  SELECT COALESCE(SUM(amount), 0)
  INTO v_frozen_amount
  FROM public.merchant_payouts
  WHERE merchant_id = p_merchant_id
    AND status IN ('pending', 'processing', 'initiated');

  -- PENDING_RELEASES: Funds in escrow awaiting release
  SELECT COALESCE(SUM(o.amount), 0)
  INTO v_pending_releases
  FROM public.orders o
  WHERE o.merchant_id = p_merchant_id
    AND o.status IN ('escrow_locked', 'in_progress', 'delivered', 'disputed');

  RETURN QUERY SELECT
    v_total_credits AS total_credits,
    v_total_debits AS total_debits,
    (v_total_credits - v_total_debits) AS current_balance,
    v_frozen_amount AS frozen_amount,
    GREATEST(0, v_total_credits - v_total_debits - v_frozen_amount) AS available_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM public.merchant_wallet_transactions 
     WHERE merchant_id = p_merchant_id AND transaction_type = 'withdrawal' AND status = 'success') AS total_withdrawn,
    v_pending_releases AS pending_releases;
END;
$$;

-- Create view for easy balance querying (READ-ONLY)
CREATE OR REPLACE VIEW public.merchant_wallet_balances AS
SELECT 
  mw.merchant_id,
  mw.currency,
  mw.status as wallet_status,
  bal.total_credits,
  bal.total_debits,
  bal.current_balance,
  bal.frozen_amount,
  bal.available_balance,
  bal.total_withdrawn,
  bal.pending_releases
FROM public.merchant_wallets mw
CROSS JOIN LATERAL public.compute_merchant_balance_from_ledger(mw.merchant_id) bal;

-- Create function to check if withdrawal is allowed
CREATE OR REPLACE FUNCTION public.can_merchant_withdraw(
  p_merchant_id UUID,
  p_amount NUMERIC
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  available_balance NUMERIC,
  kyc_status TEXT,
  has_disputes BOOLEAN,
  is_frozen BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_kyc_status TEXT;
  v_has_disputes BOOLEAN;
  v_is_frozen BOOLEAN;
  v_merchant_status TEXT;
BEGIN
  -- Get computed balance
  SELECT * INTO v_balance FROM public.compute_merchant_balance_from_ledger(p_merchant_id);
  
  -- Check KYC
  SELECT status INTO v_kyc_status
  FROM public.merchant_kyc
  WHERE merchant_id = p_merchant_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check for active disputes
  SELECT EXISTS(
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE o.merchant_id = p_merchant_id
      AND d.status IN ('open', 'under_review', 'pending')
  ) INTO v_has_disputes;
  
  -- Check if escrow is frozen
  SELECT COALESCE(is_frozen, false) INTO v_is_frozen
  FROM public.escrow_accounts
  WHERE merchant_id = p_merchant_id;
  
  -- Check merchant status
  SELECT status INTO v_merchant_status
  FROM public.merchants
  WHERE user_id = p_merchant_id;

  -- Determine if withdrawal is allowed
  IF v_kyc_status IS NULL OR v_kyc_status NOT IN ('approved', 'verified') THEN
    RETURN QUERY SELECT false, 'KYC not approved', v_balance.available_balance, v_kyc_status, v_has_disputes, v_is_frozen;
    RETURN;
  END IF;
  
  IF v_has_disputes THEN
    RETURN QUERY SELECT false, 'Active disputes exist', v_balance.available_balance, v_kyc_status, v_has_disputes, v_is_frozen;
    RETURN;
  END IF;
  
  IF v_is_frozen THEN
    RETURN QUERY SELECT false, 'Account is frozen', v_balance.available_balance, v_kyc_status, v_has_disputes, v_is_frozen;
    RETURN;
  END IF;
  
  IF v_merchant_status IN ('banned', 'suspended') THEN
    RETURN QUERY SELECT false, 'Account is ' || v_merchant_status, v_balance.available_balance, v_kyc_status, v_has_disputes, v_is_frozen;
    RETURN;
  END IF;
  
  IF p_amount > v_balance.available_balance THEN
    RETURN QUERY SELECT false, 'Insufficient balance', v_balance.available_balance, v_kyc_status, v_has_disputes, v_is_frozen;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Withdrawal allowed', v_balance.available_balance, v_kyc_status, v_has_disputes, v_is_frozen;
END;
$$;

-- Create function to sync wallet from ledger (replaces old trigger logic)
CREATE OR REPLACE FUNCTION public.sync_merchant_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
BEGIN
  -- Compute balance from ledger
  SELECT * INTO v_balance FROM public.compute_merchant_balance_from_ledger(NEW.merchant_id);
  
  -- Update wallet with computed values (sync, not direct manipulation)
  UPDATE public.merchant_wallets
  SET 
    available_balance = v_balance.available_balance,
    pending_balance = v_balance.pending_releases,
    total_paid_out = v_balance.total_withdrawn,
    updated_at = now()
  WHERE merchant_id = NEW.merchant_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync wallet after ledger entry
DROP TRIGGER IF EXISTS trigger_sync_merchant_wallet_balance ON public.merchant_wallet_transactions;
CREATE TRIGGER trigger_sync_merchant_wallet_balance
  AFTER INSERT ON public.merchant_wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_merchant_wallet_balance();

-- Create function to record withdrawal with proper ledger entries
CREATE OR REPLACE FUNCTION public.create_merchant_withdrawal(
  p_merchant_id UUID,
  p_amount NUMERIC,
  p_bank_account_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  payout_id UUID,
  amount NUMERIC,
  withdrawal_fee NUMERIC,
  gst_on_fee NUMERIC,
  net_amount NUMERIC,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_can_withdraw RECORD;
  v_bank_account RECORD;
  v_withdrawal_fee NUMERIC;
  v_gst_on_fee NUMERIC;
  v_net_amount NUMERIC;
  v_payout_id UUID;
  v_idempotency_key TEXT;
  v_existing_payout UUID;
  v_transaction_id TEXT;
BEGIN
  -- Generate idempotency key if not provided
  v_idempotency_key := COALESCE(p_idempotency_key, 'payout_' || p_merchant_id || '_' || gen_random_uuid());
  
  -- Check for existing payout with this idempotency key
  SELECT id INTO v_existing_payout
  FROM public.merchant_payouts
  WHERE idempotency_key = v_idempotency_key;
  
  IF v_existing_payout IS NOT NULL THEN
    RETURN QUERY SELECT true, v_existing_payout, p_amount, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'Already processed (idempotent)'::TEXT;
    RETURN;
  END IF;
  
  -- Check if withdrawal is allowed
  SELECT * INTO v_can_withdraw FROM public.can_merchant_withdraw(p_merchant_id, p_amount);
  
  IF NOT v_can_withdraw.allowed THEN
    RETURN QUERY SELECT false, NULL::UUID, p_amount, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, v_can_withdraw.reason;
    RETURN;
  END IF;
  
  -- Verify bank account
  SELECT * INTO v_bank_account
  FROM public.merchant_bank_accounts
  WHERE id = p_bank_account_id
    AND merchant_id = p_merchant_id
    AND is_verified = true;
    
  IF v_bank_account IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, p_amount, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'Bank account not found or not verified'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate fees: 2.5% withdrawal fee + 18% GST on the fee
  v_withdrawal_fee := ROUND(p_amount * 0.025, 2);
  v_gst_on_fee := ROUND(v_withdrawal_fee * 0.18, 2);
  v_net_amount := p_amount - v_withdrawal_fee - v_gst_on_fee;
  v_transaction_id := 'TXN' || EXTRACT(EPOCH FROM now())::BIGINT || UPPER(SUBSTR(gen_random_uuid()::TEXT, 1, 6));
  
  -- Get current balance for ledger entry
  SELECT * INTO v_balance FROM public.compute_merchant_balance_from_ledger(p_merchant_id);
  
  -- Create payout record
  INSERT INTO public.merchant_payouts (
    merchant_id,
    bank_account_id,
    amount,
    fee,
    gst,
    withdrawal_fee,
    net_amount,
    notes,
    status,
    transaction_id,
    idempotency_key
  ) VALUES (
    p_merchant_id,
    p_bank_account_id,
    p_amount,
    v_withdrawal_fee + v_gst_on_fee,
    v_gst_on_fee,
    v_withdrawal_fee,
    v_net_amount,
    p_notes,
    'processing',
    v_transaction_id,
    v_idempotency_key
  ) RETURNING id INTO v_payout_id;
  
  -- Create ledger entry for withdrawal (main debit)
  INSERT INTO public.merchant_wallet_transactions (
    merchant_id,
    transaction_type,
    entry_type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    reason,
    currency
  ) VALUES (
    p_merchant_id,
    'withdrawal',
    'withdrawal_debit',
    p_amount,
    v_balance.current_balance,
    v_balance.current_balance - p_amount,
    'pending',
    'payout',
    v_payout_id,
    'Withdrawal to ' || v_bank_account.bank_name || ' ••••' || RIGHT(v_bank_account.account_number, 4),
    'INR'
  );
  
  -- Create ledger entry for withdrawal fee
  INSERT INTO public.merchant_wallet_transactions (
    merchant_id,
    transaction_type,
    entry_type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    reason,
    currency
  ) VALUES (
    p_merchant_id,
    'fee',
    'withdrawal_fee_debit',
    v_withdrawal_fee,
    v_balance.current_balance - p_amount,
    v_balance.current_balance - p_amount,
    'success',
    'payout',
    v_payout_id,
    'Withdrawal fee (2.5%)',
    'INR'
  );
  
  -- Create ledger entry for GST on fee
  INSERT INTO public.merchant_wallet_transactions (
    merchant_id,
    transaction_type,
    entry_type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    reason,
    currency
  ) VALUES (
    p_merchant_id,
    'gst',
    'gst_on_withdrawal_fee',
    v_gst_on_fee,
    v_balance.current_balance - p_amount,
    v_balance.current_balance - p_amount,
    'success',
    'payout',
    v_payout_id,
    'GST on withdrawal fee (18%)',
    'INR'
  );
  
  -- Create notification
  INSERT INTO public.merchant_notifications (
    merchant_id,
    title,
    body,
    type,
    priority
  ) VALUES (
    p_merchant_id,
    'Withdrawal Processing',
    'Your withdrawal of ₹' || TO_CHAR(v_net_amount, 'FM99,99,99,990.00') || ' (after ₹' || TO_CHAR(v_withdrawal_fee, 'FM99,990.00') || ' fee + ₹' || TO_CHAR(v_gst_on_fee, 'FM99,990.00') || ' GST) is being processed.',
    'payout',
    'normal'
  );
  
  RETURN QUERY SELECT true, v_payout_id, p_amount, v_withdrawal_fee, v_gst_on_fee, v_net_amount, NULL::TEXT;
END;
$$;

-- Create function to reverse a failed withdrawal
CREATE OR REPLACE FUNCTION public.reverse_failed_withdrawal(
  p_payout_id UUID,
  p_failure_reason TEXT DEFAULT 'Payment gateway failure'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout RECORD;
  v_balance RECORD;
BEGIN
  -- Get payout details
  SELECT * INTO v_payout
  FROM public.merchant_payouts
  WHERE id = p_payout_id
    AND status IN ('processing', 'pending', 'initiated');
    
  IF v_payout IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get current balance
  SELECT * INTO v_balance FROM public.compute_merchant_balance_from_ledger(v_payout.merchant_id);
  
  -- Update payout status to failed
  UPDATE public.merchant_payouts
  SET 
    status = 'failed',
    failure_reason = p_failure_reason,
    updated_at = now()
  WHERE id = p_payout_id;
  
  -- Update the original withdrawal ledger entry to failed
  UPDATE public.merchant_wallet_transactions
  SET status = 'failed'
  WHERE reference_id = p_payout_id
    AND transaction_type = 'withdrawal';
  
  -- Create reversal credit entry
  INSERT INTO public.merchant_wallet_transactions (
    merchant_id,
    transaction_type,
    entry_type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    reason,
    currency
  ) VALUES (
    v_payout.merchant_id,
    'withdrawal_reversal',
    'withdrawal_reversal_credit',
    v_payout.amount,
    v_balance.current_balance,
    v_balance.current_balance + v_payout.amount,
    'success',
    'payout',
    p_payout_id,
    'Withdrawal reversed: ' || p_failure_reason,
    'INR'
  );
  
  -- Create notification
  INSERT INTO public.merchant_notifications (
    merchant_id,
    title,
    body,
    type,
    priority
  ) VALUES (
    v_payout.merchant_id,
    'Withdrawal Failed',
    'Your withdrawal of ₹' || TO_CHAR(v_payout.amount, 'FM99,99,99,990.00') || ' has failed. Reason: ' || p_failure_reason || '. The funds have been returned to your available balance.',
    'payout',
    'high'
  );
  
  RETURN true;
END;
$$;

-- Create function to complete a successful withdrawal
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_payout_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout RECORD;
BEGIN
  -- Get payout details
  SELECT * INTO v_payout
  FROM public.merchant_payouts
  WHERE id = p_payout_id
    AND status IN ('processing', 'pending', 'initiated');
    
  IF v_payout IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update payout status to paid/completed
  UPDATE public.merchant_payouts
  SET 
    status = 'paid',
    processed_at = now(),
    updated_at = now()
  WHERE id = p_payout_id;
  
  -- Update the withdrawal ledger entry to success
  UPDATE public.merchant_wallet_transactions
  SET status = 'success'
  WHERE reference_id = p_payout_id
    AND transaction_type = 'withdrawal';
  
  -- Create notification
  INSERT INTO public.merchant_notifications (
    merchant_id,
    title,
    body,
    type,
    priority
  ) VALUES (
    v_payout.merchant_id,
    'Withdrawal Completed',
    'Your withdrawal of ₹' || TO_CHAR(v_payout.net_amount, 'FM99,99,99,990.00') || ' has been deposited to your bank account.',
    'payout',
    'normal'
  );
  
  RETURN true;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.merchant_wallet_balances TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_merchant_balance_from_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_merchant_withdraw TO authenticated;