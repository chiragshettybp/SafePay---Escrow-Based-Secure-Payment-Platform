-- Add RLS policy for admins to UPDATE bank_accounts
CREATE POLICY "Admins can update all bank accounts"
ON public.bank_accounts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));