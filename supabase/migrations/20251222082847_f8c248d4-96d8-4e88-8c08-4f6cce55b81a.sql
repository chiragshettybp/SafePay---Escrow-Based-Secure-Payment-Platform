-- Add is_delayed column to tracking table
ALTER TABLE public.tracking ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tracking ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE public.tracking ADD COLUMN IF NOT EXISTS actual_delivery_date DATE;
ALTER TABLE public.tracking ADD COLUMN IF NOT EXISTS shipment_number TEXT;
ALTER TABLE public.tracking ADD COLUMN IF NOT EXISTS logistics_provider TEXT;

-- Create shipment_issues table
CREATE TABLE public.shipment_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.tracking(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  issue_status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  order_impact TEXT,
  created_by UUID,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shipment_issues
ALTER TABLE public.shipment_issues ENABLE ROW LEVEL SECURITY;

-- RLS policies for shipment_issues
CREATE POLICY "Admins can view all shipment issues"
ON public.shipment_issues FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create shipment issues"
ON public.shipment_issues FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update shipment issues"
ON public.shipment_issues FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view issues for their shipments"
ON public.shipment_issues FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tracking t
  JOIN orders o ON o.id = t.order_id
  WHERE t.id = shipment_issues.shipment_id AND o.merchant_id = auth.uid()
));

-- Create shipment_actions_log table
CREATE TABLE public.shipment_actions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.tracking(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT,
  previous_value JSONB,
  new_value JSONB,
  admin_id UUID NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shipment_actions_log
ALTER TABLE public.shipment_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for shipment_actions_log
CREATE POLICY "Admins can view all shipment action logs"
ON public.shipment_actions_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create shipment action logs"
ON public.shipment_actions_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on shipment_issues
CREATE TRIGGER update_shipment_issues_updated_at
BEFORE UPDATE ON public.shipment_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_shipment_issues_shipment_id ON public.shipment_issues(shipment_id);
CREATE INDEX idx_shipment_issues_status ON public.shipment_issues(issue_status);
CREATE INDEX idx_shipment_actions_log_shipment_id ON public.shipment_actions_log(shipment_id);
CREATE INDEX idx_tracking_is_delayed ON public.tracking(is_delayed);
CREATE INDEX idx_tracking_status ON public.tracking(status);