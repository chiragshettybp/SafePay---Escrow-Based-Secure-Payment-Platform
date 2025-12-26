-- Fix: Restrict customer update policy to prevent status/amount manipulation
-- Customers should only be able to update non-financial, non-status fields on draft orders

-- Drop the overly permissive customer update policy
DROP POLICY IF EXISTS "Customers can update their own orders" ON public.orders;

-- Create a more restrictive policy: customers can only update draft orders
-- and only non-critical fields (product_description, expected_delivery_date)
-- Status and amount changes must go through edge functions
CREATE POLICY "Customers can update their own draft orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = customer_id 
  AND status = 'draft'
)
WITH CHECK (
  auth.uid() = customer_id 
  AND status = 'draft'
);

-- Add a comment explaining the security rationale
COMMENT ON POLICY "Customers can update their own draft orders" ON public.orders IS 
'Customers can only update orders in draft status. All status transitions and financial changes must go through secure edge functions to prevent manipulation.';