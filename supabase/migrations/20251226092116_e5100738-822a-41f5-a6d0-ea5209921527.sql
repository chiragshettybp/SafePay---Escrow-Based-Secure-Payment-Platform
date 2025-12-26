-- FIX: Add unique constraint to prevent duplicate escrow credits per order
-- This ensures exactly one escrow credit transaction per order

-- First, create a unique partial index for credit transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_transactions_unique_credit_per_order 
ON public.escrow_transactions (order_id, transaction_type) 
WHERE transaction_type = 'credit';

-- Add comment explaining the constraint
COMMENT ON INDEX idx_escrow_transactions_unique_credit_per_order IS 
'Ensures exactly one credit transaction per order to prevent duplicate escrow allocations';

-- Also add unique constraint on payments.order_id to prevent duplicate payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_order 
ON public.payments (order_id);

COMMENT ON INDEX idx_payments_unique_order IS 
'Ensures exactly one payment record per order to prevent duplicate payments';