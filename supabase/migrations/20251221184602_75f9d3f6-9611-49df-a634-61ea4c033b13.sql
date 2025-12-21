-- Drop the problematic foreign key constraint on orders.merchant_id
-- The merchant_id should reference the merchants table's user_id, not auth.users directly
-- Merchants are already validated through the merchants table which has its own FK to auth.users

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_merchant_id_fkey;

-- Note: We don't add a new FK because:
-- 1. The merchants table already validates that merchant user_ids exist in auth.users
-- 2. Adding a FK to merchants.user_id would require the merchants table to have user_id as unique/primary
-- 3. The RLS policies already ensure only valid merchants can receive orders