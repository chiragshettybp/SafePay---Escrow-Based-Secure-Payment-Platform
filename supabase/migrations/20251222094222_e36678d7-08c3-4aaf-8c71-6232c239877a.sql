-- Create escrow_accounts table
CREATE TABLE public.escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE,
  total_balance NUMERIC NOT NULL DEFAULT 0,
  locked_balance NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  risk_flag TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create escrow_transactions table
CREATE TABLE public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_account_id UUID NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  transaction_type TEXT NOT NULL, -- credit, debit, lock, unlock, adjustment
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_financial_actions_log table
CREATE TABLE public.admin_financial_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- escrow_lock, escrow_unlock, escrow_adjust, escrow_freeze, withdrawal_approve, withdrawal_reject, withdrawal_process, withdrawal_paid, withdrawal_failed
  target_type TEXT NOT NULL, -- escrow_account, withdrawal_request
  target_id UUID NOT NULL,
  amount NUMERIC,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add withdrawal_transactions table for withdrawal lifecycle
CREATE TABLE public.withdrawal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES public.merchant_payouts(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  gateway_response JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_financial_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_transactions ENABLE ROW LEVEL SECURITY;

-- Escrow accounts RLS policies
CREATE POLICY "Admins can view all escrow accounts"
ON public.escrow_accounts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update escrow accounts"
ON public.escrow_accounts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert escrow accounts"
ON public.escrow_accounts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their own escrow account"
ON public.escrow_accounts FOR SELECT
USING (merchant_id = auth.uid() AND has_role(auth.uid(), 'merchant'::app_role));

-- Escrow transactions RLS policies
CREATE POLICY "Admins can view all escrow transactions"
ON public.escrow_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert escrow transactions"
ON public.escrow_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their own escrow transactions"
ON public.escrow_transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.escrow_accounts ea
  WHERE ea.id = escrow_transactions.escrow_account_id
  AND ea.merchant_id = auth.uid()
) AND has_role(auth.uid(), 'merchant'::app_role));

-- Admin financial actions log RLS policies
CREATE POLICY "Admins can view all financial actions"
ON public.admin_financial_actions_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert financial actions"
ON public.admin_financial_actions_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Withdrawal transactions RLS policies
CREATE POLICY "Admins can view all withdrawal transactions"
ON public.withdrawal_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert withdrawal transactions"
ON public.withdrawal_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their own withdrawal transactions"
ON public.withdrawal_transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.merchant_payouts mp
  WHERE mp.id = withdrawal_transactions.payout_id
  AND mp.merchant_id = auth.uid()
) AND has_role(auth.uid(), 'merchant'::app_role));

-- Create trigger for updated_at on escrow_accounts
CREATE TRIGGER update_escrow_accounts_updated_at
BEFORE UPDATE ON public.escrow_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_transactions;