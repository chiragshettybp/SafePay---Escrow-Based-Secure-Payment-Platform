-- Create support_status_history table
CREATE TABLE IF NOT EXISTS public.support_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  previous_priority TEXT,
  new_priority TEXT,
  changed_by UUID NOT NULL,
  changed_by_type TEXT NOT NULL DEFAULT 'user',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_actions_log table
CREATE TABLE IF NOT EXISTS public.support_actions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.support_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_actions_log ENABLE ROW LEVEL SECURITY;

-- Add admin policies for support_tickets
CREATE POLICY "Admins can view all support tickets" 
ON public.support_tickets 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all support tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policies for support_messages
CREATE POLICY "Admins can view all support messages" 
ON public.support_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create messages on any ticket" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policies for support_attachments
CREATE POLICY "Admins can view all support attachments" 
ON public.support_attachments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload attachments to any ticket" 
ON public.support_attachments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policies for support_status_history
CREATE POLICY "Admins can view all status history" 
ON public.support_status_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create status history" 
ON public.support_status_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policies for support_actions_log
CREATE POLICY "Admins can view all actions log" 
ON public.support_actions_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create actions log" 
ON public.support_actions_log 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own ticket status history
CREATE POLICY "Users can view their own ticket history"
ON public.support_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_status_history.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);