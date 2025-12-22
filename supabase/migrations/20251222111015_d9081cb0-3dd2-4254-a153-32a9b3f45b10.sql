-- Add admin policies for kyc_records
CREATE POLICY "Admins can view all KYC records"
ON public.kyc_records
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update KYC records"
ON public.kyc_records
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policies for bank_accounts
CREATE POLICY "Admins can view all bank accounts"
ON public.bank_accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));