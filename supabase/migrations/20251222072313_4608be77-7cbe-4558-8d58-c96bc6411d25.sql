-- Add RLS policies for admin to access disputes and related tables

-- Disputes table - Admin can view all disputes
CREATE POLICY "Admins can view all disputes"
ON public.disputes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Disputes table - Admin can update all disputes
CREATE POLICY "Admins can update all disputes"
ON public.disputes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Dispute updates - Admin can view all updates
CREATE POLICY "Admins can view all dispute updates"
ON public.dispute_updates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Dispute updates - Admin can insert updates
CREATE POLICY "Admins can insert dispute updates"
ON public.dispute_updates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Dispute comments - Admin can view all comments
CREATE POLICY "Admins can view all dispute comments"
ON public.dispute_comments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Dispute comments - Admin can insert comments
CREATE POLICY "Admins can insert dispute comments"
ON public.dispute_comments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Dispute files - Admin can view all files
CREATE POLICY "Admins can view all dispute files"
ON public.dispute_files
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Merchant evidence - Admin can view all evidence
CREATE POLICY "Admins can view all merchant evidence"
ON public.merchant_evidence
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Orders - Admin can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Payments - Admin can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Profiles - Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Merchants - Admin can view all merchants
CREATE POLICY "Admins can view all merchants"
ON public.merchants
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));