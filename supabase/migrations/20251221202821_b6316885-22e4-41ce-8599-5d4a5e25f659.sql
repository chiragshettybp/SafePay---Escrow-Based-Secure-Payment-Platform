-- Update default currency to INR for merchant_wallets table
ALTER TABLE public.merchant_wallets 
ALTER COLUMN currency SET DEFAULT 'INR';

-- Update existing wallets to use INR
UPDATE public.merchant_wallets SET currency = 'INR' WHERE currency = 'USD';