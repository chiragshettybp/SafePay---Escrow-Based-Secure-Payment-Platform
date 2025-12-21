-- Allow authenticated users to see active merchants for payment creation
CREATE POLICY "Authenticated users can view active merchants" 
ON public.merchants 
FOR SELECT 
USING (status = 'active');