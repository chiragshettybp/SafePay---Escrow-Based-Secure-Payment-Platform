-- Create refunds table
CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  dispute_id UUID REFERENCES public.disputes(id),
  customer_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'processing', 'success', 'failed')),
  reason TEXT NOT NULL,
  failure_reason TEXT,
  retry_allowed BOOLEAN DEFAULT true,
  payment_method TEXT,
  payment_method_last4 TEXT,
  transaction_id TEXT,
  receipt_url TEXT,
  credited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refund_events table for timeline
CREATE TABLE public.refund_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for refunds
CREATE POLICY "Customers can view their own refunds"
ON public.refunds FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "System can create refunds"
ON public.refunds FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own refunds"
ON public.refunds FOR UPDATE
USING (auth.uid() = customer_id);

-- RLS policies for refund_events
CREATE POLICY "Customers can view events for their refunds"
ON public.refund_events FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.refunds
  WHERE refunds.id = refund_events.refund_id
  AND refunds.customer_id = auth.uid()
));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.refunds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.refund_events;

-- Trigger for updated_at
CREATE TRIGGER update_refunds_updated_at
BEFORE UPDATE ON public.refunds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create initial refund event
CREATE OR REPLACE FUNCTION public.create_refund_initiated_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.refund_events (refund_id, event_type, title, description)
  VALUES (NEW.id, 'initiated', 'Refund Initiated', 'Your refund request has been submitted for processing.');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_refund_created
AFTER INSERT ON public.refunds
FOR EACH ROW
EXECUTE FUNCTION public.create_refund_initiated_event();