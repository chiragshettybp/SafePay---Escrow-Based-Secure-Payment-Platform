-- Create trigger function to automatically create escrow account for new merchants
CREATE OR REPLACE FUNCTION public.handle_new_merchant_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.escrow_accounts (merchant_id, total_balance, locked_balance, available_balance)
  VALUES (NEW.user_id, 0, 0, 0)
  ON CONFLICT (merchant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on merchants table
DROP TRIGGER IF EXISTS on_merchant_created_escrow ON public.merchants;
CREATE TRIGGER on_merchant_created_escrow
  AFTER INSERT ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_merchant_escrow();

-- Backfill: Create escrow accounts for existing merchants that don't have one
INSERT INTO public.escrow_accounts (merchant_id, total_balance, locked_balance, available_balance)
SELECT m.user_id, 0, 0, 0
FROM public.merchants m
WHERE NOT EXISTS (
  SELECT 1 FROM public.escrow_accounts ea WHERE ea.merchant_id = m.user_id
)
ON CONFLICT (merchant_id) DO NOTHING;