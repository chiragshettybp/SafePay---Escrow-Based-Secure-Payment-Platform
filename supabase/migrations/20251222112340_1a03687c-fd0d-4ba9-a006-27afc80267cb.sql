-- Add RLS policies for admins to view customer wallets and transactions
CREATE POLICY "Admins can view all wallets"
ON public.wallets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all wallets"
ON public.wallets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all wallet transactions"
ON public.wallet_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all wallet transactions"
ON public.wallet_transactions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));