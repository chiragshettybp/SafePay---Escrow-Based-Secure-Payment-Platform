-- Add RLS policies for admin access to payout-related tables

-- Admin can view all merchant payouts
CREATE POLICY "Admins can view all merchant payouts"
ON public.merchant_payouts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update merchant payouts (for approval/decline)
CREATE POLICY "Admins can update merchant payouts"
ON public.merchant_payouts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update merchant wallets (for balance deduction on payout)
CREATE POLICY "Admins can update merchant wallets"
ON public.merchant_wallets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));