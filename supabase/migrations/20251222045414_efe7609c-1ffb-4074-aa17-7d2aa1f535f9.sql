-- User Security Settings Table
CREATE TABLE public.user_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  two_factor_method text DEFAULT NULL,
  last_password_change timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_security
CREATE POLICY "Users can view own security settings"
  ON public.user_security FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own security settings"
  ON public.user_security FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own security settings"
  ON public.user_security FOR UPDATE
  USING (auth.uid() = user_id);

-- User Notification Preferences Table
CREATE TABLE public.user_notification_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  order_in_app boolean NOT NULL DEFAULT true,
  order_email boolean NOT NULL DEFAULT true,
  order_sms boolean NOT NULL DEFAULT false,
  payment_in_app boolean NOT NULL DEFAULT true,
  payment_email boolean NOT NULL DEFAULT true,
  payment_sms boolean NOT NULL DEFAULT false,
  dispute_in_app boolean NOT NULL DEFAULT true,
  dispute_email boolean NOT NULL DEFAULT true,
  dispute_sms boolean NOT NULL DEFAULT true,
  refund_in_app boolean NOT NULL DEFAULT true,
  refund_email boolean NOT NULL DEFAULT true,
  refund_sms boolean NOT NULL DEFAULT false,
  system_in_app boolean NOT NULL DEFAULT true,
  system_email boolean NOT NULL DEFAULT false,
  system_sms boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_prefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_notification_prefs
CREATE POLICY "Users can view own notification prefs"
  ON public.user_notification_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification prefs"
  ON public.user_notification_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification prefs"
  ON public.user_notification_prefs FOR UPDATE
  USING (auth.uid() = user_id);

-- User Privacy Requests Table
CREATE TABLE public.user_privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL, -- 'data_export', 'account_deletion'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
  notes text,
  processed_at timestamp with time zone,
  processed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_privacy_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_privacy_requests
CREATE POLICY "Users can view own privacy requests"
  ON public.user_privacy_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own privacy requests"
  ON public.user_privacy_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Support Tickets Table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_number text NOT NULL UNIQUE,
  category text NOT NULL, -- 'order', 'payment', 'refund', 'account', 'other'
  related_order_id uuid REFERENCES public.orders(id),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'awaiting_response', 'resolved', 'closed'
  priority text NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_to uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view own support tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own support tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id);

-- Support Messages Table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  attachments text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages on their tickets"
  ON public.support_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages on their tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  ));

-- Support Ticket Attachments Table
CREATE TABLE public.support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.support_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_attachments
CREATE POLICY "Users can view attachments on their tickets"
  ON public.support_attachments FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_attachments.ticket_id
    AND support_tickets.user_id = auth.uid()
  ));

CREATE POLICY "Users can upload attachments to their tickets"
  ON public.support_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- FAQs Table
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS (public read)
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for FAQs (public read)
CREATE POLICY "Anyone can view active FAQs"
  ON public.faqs FOR SELECT
  USING (is_active = true);

-- Insert some default FAQs
INSERT INTO public.faqs (category, question, answer, order_index) VALUES
('Orders', 'How do I track my order?', 'Go to Orders page and click on the order you want to track. You will see the tracking details and shipment timeline.', 1),
('Orders', 'Can I cancel my order?', 'You can cancel an order if it has not been shipped yet. Go to Order Details and click Cancel Order.', 2),
('Payments', 'How does escrow protection work?', 'When you make a payment, the funds are held securely in escrow until you confirm delivery. This protects both buyers and sellers.', 1),
('Payments', 'When will the seller receive payment?', 'The seller receives payment once you confirm delivery or after the automatic release period expires.', 2),
('Refunds', 'How long do refunds take?', 'Refunds are typically processed within 5-7 business days, depending on your payment method and bank.', 1),
('Refunds', 'Can I get a partial refund?', 'Yes, partial refunds may be issued in dispute resolutions based on the outcome.', 2),
('Disputes', 'How do I file a dispute?', 'Go to Order Details and click "Raise Dispute". Provide details about the issue and upload supporting evidence.', 1),
('Disputes', 'What happens after I file a dispute?', 'Our team will review your case. The merchant has time to respond, and we will make a fair decision based on the evidence.', 2),
('Account', 'How do I change my password?', 'Go to Settings > Security and click "Change Password". Enter your current password and set a new one.', 1),
('Account', 'How do I enable two-factor authentication?', 'Go to Settings > Security and toggle on Two-Factor Authentication. Follow the setup instructions.', 2);

-- Enable Realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_privacy_requests;

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', false);

-- Storage policies for support-attachments bucket
CREATE POLICY "Users can upload support attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own support attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate ticket number
CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_number();

-- Updated at triggers
CREATE TRIGGER update_user_security_updated_at
  BEFORE UPDATE ON public.user_security
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_privacy_requests_updated_at
  BEFORE UPDATE ON public.user_privacy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();