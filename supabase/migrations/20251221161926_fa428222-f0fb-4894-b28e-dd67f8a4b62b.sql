-- Update RLS policies for merchants table to use has_role function
DROP POLICY IF EXISTS "Merchants can view their own profile" ON public.merchants;
DROP POLICY IF EXISTS "Merchants can update their own profile" ON public.merchants;

CREATE POLICY "Merchants can view their own profile" 
ON public.merchants 
FOR SELECT 
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'merchant'));

CREATE POLICY "Merchants can update their own profile" 
ON public.merchants 
FOR UPDATE 
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'merchant'));

-- Update order policies for merchant access with role check
DROP POLICY IF EXISTS "Merchants can view orders assigned to them" ON public.orders;
DROP POLICY IF EXISTS "Merchants can update orders assigned to them" ON public.orders;

CREATE POLICY "Merchants can view orders assigned to them" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = merchant_id AND public.has_role(auth.uid(), 'merchant'));

CREATE POLICY "Merchants can update orders assigned to them" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = merchant_id AND public.has_role(auth.uid(), 'merchant'));