-- Add RLS policies for admin to access merchant KYC and related tables

-- Merchant KYC - Admin can view all
CREATE POLICY "Admins can view all merchant KYC"
ON public.merchant_kyc
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Merchant KYC - Admin can update all
CREATE POLICY "Admins can update all merchant KYC"
ON public.merchant_kyc
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Merchant KYC Documents - Admin can view all
CREATE POLICY "Admins can view all merchant KYC documents"
ON public.merchant_kyc_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Merchant Bank Accounts - Admin can view all
CREATE POLICY "Admins can view all merchant bank accounts"
ON public.merchant_bank_accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Merchant Wallets - Admin can view all
CREATE POLICY "Admins can view all merchant wallets"
ON public.merchant_wallets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update merchants
CREATE POLICY "Admins can update all merchants"
ON public.merchants
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));