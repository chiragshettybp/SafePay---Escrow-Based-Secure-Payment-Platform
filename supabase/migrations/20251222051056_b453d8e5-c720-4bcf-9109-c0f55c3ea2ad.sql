-- Add audience column to FAQs table for filtering customer vs merchant FAQs
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

-- Update existing FAQs to be available to all audiences
UPDATE public.faqs SET audience = 'all' WHERE audience IS NULL;

-- Add RLS policies for merchants to access support tables
-- Merchants can create support tickets
CREATE POLICY "Merchants can create support tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  has_role(auth.uid(), 'merchant'::app_role)
);

-- Merchants can view their own support tickets
CREATE POLICY "Merchants can view their own support tickets" 
ON public.support_tickets 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  has_role(auth.uid(), 'merchant'::app_role)
);

-- Merchants can update their own support tickets (e.g., close)
CREATE POLICY "Merchants can update their own support tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  has_role(auth.uid(), 'merchant'::app_role)
);

-- Merchants can create messages on their tickets
CREATE POLICY "Merchants can create messages on their tickets" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  ) AND 
  has_role(auth.uid(), 'merchant'::app_role)
);

-- Merchants can view messages on their tickets
CREATE POLICY "Merchants can view messages on their tickets" 
ON public.support_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  ) AND 
  has_role(auth.uid(), 'merchant'::app_role)
);

-- Merchants can upload attachments to their tickets
CREATE POLICY "Merchants can upload attachments to their tickets" 
ON public.support_attachments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  has_role(auth.uid(), 'merchant'::app_role)
);

-- Merchants can view attachments on their tickets
CREATE POLICY "Merchants can view attachments on their tickets" 
ON public.support_attachments 
FOR SELECT 
USING (
  (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_attachments.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )) AND 
  has_role(auth.uid(), 'merchant'::app_role)
);

-- Add index for audience filtering
CREATE INDEX IF NOT EXISTS idx_faqs_audience ON public.faqs(audience);

-- Add related_shipment_id column to support_tickets if it doesn't exist
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS related_shipment_id uuid;