-- Create order_events table for timeline/activity feed
CREATE TABLE public.order_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Create policies for order_events
CREATE POLICY "Customers can view events for their orders"
ON public.order_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_events.order_id 
    AND orders.customer_id = auth.uid()
  )
);

CREATE POLICY "Merchants can view events for their orders"
ON public.order_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_events.order_id 
    AND orders.merchant_id = auth.uid()
  )
);

-- Create tracking table for delivery tracking
CREATE TABLE public.tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  location TEXT,
  carrier TEXT,
  tracking_number TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for tracking
CREATE POLICY "Customers can view tracking for their orders"
ON public.tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = tracking.order_id 
    AND orders.customer_id = auth.uid()
  )
);

CREATE POLICY "Merchants can view and update tracking for their orders"
ON public.tracking
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = tracking.order_id 
    AND orders.merchant_id = auth.uid()
  )
);

-- Create tracking_events table for detailed tracking timeline
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id UUID NOT NULL REFERENCES public.tracking(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  description TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Create policies for tracking_events
CREATE POLICY "Users can view tracking events for their orders"
ON public.tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tracking t
    JOIN public.orders o ON o.id = t.order_id
    WHERE t.id = tracking_events.tracking_id 
    AND (o.customer_id = auth.uid() OR o.merchant_id = auth.uid())
  )
);

-- Create delivery_proofs table for confirm delivery uploads
CREATE TABLE public.delivery_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery_proofs
CREATE POLICY "Customers can create delivery proofs"
ON public.delivery_proofs
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own delivery proofs"
ON public.delivery_proofs
FOR SELECT
USING (auth.uid() = customer_id);

-- Add indexes for performance
CREATE INDEX idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX idx_tracking_order_id ON public.tracking(order_id);
CREATE INDEX idx_tracking_events_tracking_id ON public.tracking_events(tracking_id);
CREATE INDEX idx_delivery_proofs_order_id ON public.delivery_proofs(order_id);

-- Create function to auto-create order event when order is created
CREATE OR REPLACE FUNCTION public.create_order_created_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.order_events (order_id, event_type, title, description)
  VALUES (NEW.id, 'order_created', 'Order Created', 'Your order has been placed and payment is pending.');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new orders
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_created_event();

-- Create function to auto-create order event when status changes
CREATE OR REPLACE FUNCTION public.create_order_status_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_events (order_id, event_type, title, description, metadata)
    VALUES (
      NEW.id, 
      'status_change', 
      CASE NEW.status
        WHEN 'escrow_locked' THEN 'Payment Locked'
        WHEN 'pending' THEN 'Order Pending'
        WHEN 'in_progress' THEN 'Order In Progress'
        WHEN 'delivered' THEN 'Order Delivered'
        WHEN 'completed' THEN 'Order Completed'
        WHEN 'disputed' THEN 'Dispute Opened'
        WHEN 'refunded' THEN 'Order Refunded'
        WHEN 'cancelled' THEN 'Order Cancelled'
        ELSE 'Status Updated'
      END,
      CASE NEW.status
        WHEN 'escrow_locked' THEN 'Your payment has been locked in escrow.'
        WHEN 'pending' THEN 'Your order is pending processing.'
        WHEN 'in_progress' THEN 'Your order is being processed by the merchant.'
        WHEN 'delivered' THEN 'Your order has been delivered. Please confirm receipt.'
        WHEN 'completed' THEN 'You have confirmed delivery. Payment released to merchant.'
        WHEN 'disputed' THEN 'A dispute has been opened for this order.'
        WHEN 'refunded' THEN 'Your payment has been refunded.'
        WHEN 'cancelled' THEN 'This order has been cancelled.'
        ELSE 'Order status has been updated.'
      END,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status changes
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_status_event();

-- Create storage bucket for delivery proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', false);

-- Storage policies for delivery proofs
CREATE POLICY "Customers can upload delivery proofs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'delivery-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Customers can view their delivery proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'delivery-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);