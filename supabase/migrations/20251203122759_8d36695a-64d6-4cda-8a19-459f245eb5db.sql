-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'in_progress', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled');

-- Create enum for dispute status
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved', 'closed');

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  expected_delivery_date DATE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create disputes table
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  documents TEXT[], -- Array of storage file paths
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Orders RLS Policies
CREATE POLICY "Customers can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Merchants can view orders assigned to them"
ON public.orders FOR SELECT
USING (auth.uid() = merchant_id);

CREATE POLICY "Customers can create orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own orders"
ON public.orders FOR UPDATE
USING (auth.uid() = customer_id);

CREATE POLICY "Merchants can update orders assigned to them"
ON public.orders FOR UPDATE
USING (auth.uid() = merchant_id);

-- Disputes RLS Policies
CREATE POLICY "Customers can view their own disputes"
ON public.disputes FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create disputes"
ON public.disputes FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own disputes"
ON public.disputes FOR UPDATE
USING (auth.uid() = customer_id);

-- Notifications RLS Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for orders and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Set replica identity for realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Create updated_at triggers
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for dispute documents
INSERT INTO storage.buckets (id, name, public) VALUES ('dispute-documents', 'dispute-documents', false);

-- Storage policies for dispute documents
CREATE POLICY "Users can upload their own dispute documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dispute-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own dispute documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'dispute-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own dispute documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'dispute-documents' AND auth.uid()::text = (storage.foldername(name))[1]);