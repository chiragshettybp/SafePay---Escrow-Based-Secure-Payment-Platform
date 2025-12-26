-- DATA RECONCILIATION MIGRATION
-- Fixes historical data inconsistencies from before ledger-first enforcement

-- 1. Create reconciliation entries for orphan payments (payments without escrow credits)
-- These are payments that were created before the ledger-first system was implemented
INSERT INTO public.escrow_transactions (
  escrow_account_id,
  order_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  reason,
  created_by
)
SELECT 
  ea.id,
  p.order_id,
  'credit',
  p.amount,
  0,
  p.amount,
  'Reconciliation: Historical payment migration - created retroactively for audit trail',
  NULL
FROM public.payments p
JOIN public.orders o ON o.id = p.order_id
JOIN public.escrow_accounts ea ON ea.merchant_id = o.merchant_id
LEFT JOIN public.escrow_transactions et ON et.order_id = p.order_id AND et.transaction_type = 'credit'
WHERE et.id IS NULL
  AND p.status IN ('escrow', 'released', 'refunded')
ON CONFLICT DO NOTHING;

-- 2. For released/refunded payments, also create debit entries if missing
INSERT INTO public.escrow_transactions (
  escrow_account_id,
  order_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  reason,
  created_by
)
SELECT 
  ea.id,
  p.order_id,
  'debit',
  p.amount,
  p.amount,
  0,
  CASE 
    WHEN p.status = 'released' THEN 'Reconciliation: Historical release - funds released to merchant'
    WHEN p.status = 'refunded' THEN 'Reconciliation: Historical refund - funds returned to customer'
    ELSE 'Reconciliation: Historical debit'
  END,
  NULL
FROM public.payments p
JOIN public.orders o ON o.id = p.order_id
JOIN public.escrow_accounts ea ON ea.merchant_id = o.merchant_id
LEFT JOIN public.escrow_transactions et ON et.order_id = p.order_id AND et.transaction_type = 'debit'
WHERE et.id IS NULL
  AND p.status IN ('released', 'refunded')
ON CONFLICT DO NOTHING;

-- 3. Create wallet reconciliation entry for the customer with discrepancy
-- Customer 4e1ee39c-4cc7-497d-8df9-6367887f5956 has stored_balance=4000 but ledger shows -1000
DO $$
DECLARE
  v_wallet_id UUID;
  v_stored_balance NUMERIC;
  v_ledger_balance NUMERIC;
  v_discrepancy NUMERIC;
BEGIN
  -- Get wallet details
  SELECT id, balance INTO v_wallet_id, v_stored_balance
  FROM public.wallets
  WHERE customer_id = '4e1ee39c-4cc7-497d-8df9-6367887f5956';
  
  IF v_wallet_id IS NOT NULL THEN
    -- Calculate ledger balance
    SELECT COALESCE(SUM(
      CASE 
        WHEN type IN ('refund', 'credit', 'reversal_credit') AND status = 'success' THEN amount
        WHEN type IN ('withdrawal', 'debit', 'reversal_debit') AND status IN ('success', 'pending') THEN -amount
        ELSE 0
      END
    ), 0) INTO v_ledger_balance
    FROM public.wallet_transactions
    WHERE customer_id = '4e1ee39c-4cc7-497d-8df9-6367887f5956';
    
    v_discrepancy := v_stored_balance - v_ledger_balance;
    
    -- Create reconciliation entry if there's a discrepancy
    IF v_discrepancy > 0 THEN
      INSERT INTO public.wallet_transactions (
        wallet_id, customer_id, type, amount, status, description, reference_type
      ) VALUES (
        v_wallet_id,
        '4e1ee39c-4cc7-497d-8df9-6367887f5956',
        'credit',
        v_discrepancy,
        'success',
        'Reconciliation: Historical balance migration from pre-ledger system',
        'reconciliation'
      );
    ELSIF v_discrepancy < 0 THEN
      -- If stored is less than ledger, create reversal debit
      INSERT INTO public.wallet_transactions (
        wallet_id, customer_id, type, amount, status, description, reference_type
      ) VALUES (
        v_wallet_id,
        '4e1ee39c-4cc7-497d-8df9-6367887f5956',
        'reversal_debit',
        ABS(v_discrepancy),
        'success',
        'Reconciliation: Historical balance correction',
        'reconciliation'
      );
    END IF;
  END IF;
END $$;

-- 4. Create merchant wallet reconciliation entry
-- Merchant 11c28e93-31fe-4595-a522-cbaf64af8b9c has stored_available=3498.98 but ledger shows 0
DO $$
DECLARE
  v_stored_available NUMERIC;
  v_ledger_available NUMERIC;
  v_discrepancy NUMERIC;
BEGIN
  -- Get stored balance
  SELECT available_balance INTO v_stored_available
  FROM public.merchant_wallets
  WHERE merchant_id = '11c28e93-31fe-4595-a522-cbaf64af8b9c';
  
  IF v_stored_available IS NOT NULL THEN
    -- Calculate ledger balance
    SELECT COALESCE(SUM(CASE 
      WHEN transaction_type IN ('escrow_release', 'admin_credit', 'reversal_credit') AND status = 'success' THEN amount
      WHEN transaction_type IN ('withdrawal', 'admin_debit', 'reversal_debit', 'fee') AND status IN ('success', 'pending') THEN -amount
      ELSE 0
    END), 0) INTO v_ledger_available
    FROM public.merchant_wallet_transactions
    WHERE merchant_id = '11c28e93-31fe-4595-a522-cbaf64af8b9c';
    
    v_discrepancy := v_stored_available - v_ledger_available;
    
    -- Create reconciliation entry if there's a discrepancy
    IF v_discrepancy > 0 THEN
      INSERT INTO public.merchant_wallet_transactions (
        merchant_id, transaction_type, amount, status, reason,
        balance_before, balance_after
      ) VALUES (
        '11c28e93-31fe-4595-a522-cbaf64af8b9c',
        'admin_credit',
        v_discrepancy,
        'success',
        'Reconciliation: Historical balance migration from pre-ledger system',
        0,
        v_discrepancy
      );
    END IF;
  END IF;
END $$;

-- 5. Add scheduled consistency check function for future monitoring
CREATE OR REPLACE FUNCTION public.check_all_wallet_consistency()
RETURNS TABLE(
  user_type TEXT,
  user_id UUID,
  stored_balance NUMERIC,
  ledger_balance NUMERIC,
  discrepancy NUMERIC,
  needs_attention BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Customer wallets
  RETURN QUERY
  SELECT 
    'customer'::TEXT,
    w.customer_id,
    w.balance,
    COALESCE(SUM(CASE 
      WHEN wt.type IN ('refund', 'credit', 'reversal_credit') AND wt.status = 'success' THEN wt.amount
      WHEN wt.type IN ('withdrawal', 'debit', 'reversal_debit') AND wt.status IN ('success', 'pending') THEN -wt.amount
      ELSE 0
    END), 0),
    w.balance - COALESCE(SUM(CASE 
      WHEN wt.type IN ('refund', 'credit', 'reversal_credit') AND wt.status = 'success' THEN wt.amount
      WHEN wt.type IN ('withdrawal', 'debit', 'reversal_debit') AND wt.status IN ('success', 'pending') THEN -wt.amount
      ELSE 0
    END), 0),
    ABS(w.balance - COALESCE(SUM(CASE 
      WHEN wt.type IN ('refund', 'credit', 'reversal_credit') AND wt.status = 'success' THEN wt.amount
      WHEN wt.type IN ('withdrawal', 'debit', 'reversal_debit') AND wt.status IN ('success', 'pending') THEN -wt.amount
      ELSE 0
    END), 0)) > 0.01
  FROM public.wallets w
  LEFT JOIN public.wallet_transactions wt ON wt.customer_id = w.customer_id
  GROUP BY w.customer_id, w.balance;
  
  -- Merchant wallets
  RETURN QUERY
  SELECT 
    'merchant'::TEXT,
    mw.merchant_id,
    mw.available_balance,
    COALESCE(SUM(CASE 
      WHEN mwt.transaction_type IN ('escrow_release', 'admin_credit', 'reversal_credit') AND mwt.status = 'success' THEN mwt.amount
      WHEN mwt.transaction_type IN ('withdrawal', 'admin_debit', 'reversal_debit', 'fee') AND mwt.status IN ('success', 'pending') THEN -mwt.amount
      ELSE 0
    END), 0),
    mw.available_balance - COALESCE(SUM(CASE 
      WHEN mwt.transaction_type IN ('escrow_release', 'admin_credit', 'reversal_credit') AND mwt.status = 'success' THEN mwt.amount
      WHEN mwt.transaction_type IN ('withdrawal', 'admin_debit', 'reversal_debit', 'fee') AND mwt.status IN ('success', 'pending') THEN -mwt.amount
      ELSE 0
    END), 0),
    ABS(mw.available_balance - COALESCE(SUM(CASE 
      WHEN mwt.transaction_type IN ('escrow_release', 'admin_credit', 'reversal_credit') AND mwt.status = 'success' THEN mwt.amount
      WHEN mwt.transaction_type IN ('withdrawal', 'admin_debit', 'reversal_debit', 'fee') AND mwt.status IN ('success', 'pending') THEN -mwt.amount
      ELSE 0
    END), 0)) > 0.01
  FROM public.merchant_wallets mw
  LEFT JOIN public.merchant_wallet_transactions mwt ON mwt.merchant_id = mw.merchant_id
  GROUP BY mw.merchant_id, mw.available_balance;
END;
$$;