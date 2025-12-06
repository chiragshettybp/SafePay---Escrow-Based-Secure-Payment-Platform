-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT wallets_customer_unique UNIQUE (customer_id)
);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'credit', 'debit', 'refund', 'withdrawal'
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  reference_id UUID, -- order_id or refund_id
  reference_type TEXT, -- 'order', 'refund', 'withdrawal'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'savings', -- 'savings', 'current'
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Wallets RLS policies
CREATE POLICY "Customers can view their own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "System can create wallets for customers"
ON public.wallets FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own wallet"
ON public.wallets FOR UPDATE
USING (auth.uid() = customer_id);

-- Wallet transactions RLS policies
CREATE POLICY "Customers can view their own transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Bank accounts RLS policies
CREATE POLICY "Customers can view their own bank accounts"
ON public.bank_accounts FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create bank accounts"
ON public.bank_accounts FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own bank accounts"
ON public.bank_accounts FOR UPDATE
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete their own bank accounts"
ON public.bank_accounts FOR DELETE
USING (auth.uid() = customer_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;

-- Trigger for updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();