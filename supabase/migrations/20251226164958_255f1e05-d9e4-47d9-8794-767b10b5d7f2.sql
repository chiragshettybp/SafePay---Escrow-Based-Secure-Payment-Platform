-- Fix RLS policy for merchants to allow public access for checkout flow
-- Currently only authenticated users can view active merchants, but public checkout needs this too

-- Drop the authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view active merchants" ON public.merchants;

-- Create a new policy that allows public access to active merchants
-- This is needed for the checkout flow where customers may not be logged in
CREATE POLICY "Public can view active merchants" 
ON public.merchants 
FOR SELECT 
USING (status = 'active' OR status = 'pending_verification');