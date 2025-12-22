-- Add RLS policy for admins to view all tracking records
CREATE POLICY "Admins can view all tracking"
ON public.tracking FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to update tracking records
CREATE POLICY "Admins can update all tracking"
ON public.tracking FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));