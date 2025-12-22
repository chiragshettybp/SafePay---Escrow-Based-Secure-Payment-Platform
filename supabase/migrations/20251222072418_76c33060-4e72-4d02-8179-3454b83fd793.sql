-- Add RLS policy for admin to view order events
CREATE POLICY "Admins can view all order events"
ON public.order_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));