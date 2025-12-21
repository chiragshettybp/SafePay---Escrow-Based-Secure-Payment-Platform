-- Create merchant_wallets table
CREATE TABLE public.merchant_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL UNIQUE,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  total_paid_out NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create merchant_bank_accounts table
CREATE TABLE public.merchant_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  branch_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'savings',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create merchant_payouts table
CREATE TABLE public.merchant_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES public.merchant_bank_accounts(id),
  amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  notes TEXT,
  failure_reason TEXT,
  transaction_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_wallets
CREATE POLICY "Merchants can view their own wallet"
ON public.merchant_wallets FOR SELECT
USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update their own wallet"
ON public.merchant_wallets FOR UPDATE
USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "System can create merchant wallets"
ON public.merchant_wallets FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

-- RLS Policies for merchant_bank_accounts
CREATE POLICY "Merchants can view their own bank accounts"
ON public.merchant_bank_accounts FOR SELECT
USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can create their own bank accounts"
ON public.merchant_bank_accounts FOR INSERT
WITH CHECK (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update their own bank accounts"
ON public.merchant_bank_accounts FOR UPDATE
USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can delete their own bank accounts"
ON public.merchant_bank_accounts FOR DELETE
USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

-- RLS Policies for merchant_payouts
CREATE POLICY "Merchants can view their own payouts"
ON public.merchant_payouts FOR SELECT
USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can create their own payouts"
ON public.merchant_payouts FOR INSERT
WITH CHECK (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

-- Trigger for auto-creating merchant wallet on merchant creation
CREATE OR REPLACE FUNCTION public.handle_new_merchant_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchant_wallets (merchant_id)
  VALUES (NEW.user_id)
  ON CONFLICT (merchant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_merchant_created_create_wallet
  AFTER INSERT ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_merchant_wallet();

-- Trigger for updating timestamps
CREATE TRIGGER update_merchant_wallets_updated_at
  BEFORE UPDATE ON public.merchant_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchant_bank_accounts_updated_at
  BEFORE UPDATE ON public.merchant_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchant_payouts_updated_at
  BEFORE UPDATE ON public.merchant_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_bank_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_payouts;