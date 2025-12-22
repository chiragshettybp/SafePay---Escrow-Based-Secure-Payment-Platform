-- Create admin_notifications table for broadcast/system notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, alert, system
  target_audience TEXT NOT NULL DEFAULT 'all', -- all, customers, merchants, specific
  specific_user_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sent, archived
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_recipients table
CREATE TABLE IF NOT EXISTS public.admin_notification_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'customer', -- customer, merchant
  delivery_status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, failed
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_delivery_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- created, updated, scheduled, sent, cancelled, archived, resent
  description TEXT,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_logs ENABLE ROW LEVEL SECURITY;

-- Admin policies for admin_notifications
CREATE POLICY "Admins can view all admin notifications"
ON public.admin_notifications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create admin notifications"
ON public.admin_notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update admin notifications"
ON public.admin_notifications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete admin notifications"
ON public.admin_notifications FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for admin_notification_recipients
CREATE POLICY "Admins can view all notification recipients"
ON public.admin_notification_recipients FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create notification recipients"
ON public.admin_notification_recipients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update notification recipients"
ON public.admin_notification_recipients FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own notification recipients
CREATE POLICY "Users can view their own notification delivery"
ON public.admin_notification_recipients FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
ON public.admin_notification_recipients FOR UPDATE
USING (user_id = auth.uid());

-- Admin policies for admin_notification_logs
CREATE POLICY "Admins can view all notification logs"
ON public.admin_notification_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create notification logs"
ON public.admin_notification_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_admin_notifications_status ON public.admin_notifications(status);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notification_recipients_notification ON public.admin_notification_recipients(notification_id);
CREATE INDEX idx_admin_notification_recipients_user ON public.admin_notification_recipients(user_id);
CREATE INDEX idx_admin_notification_logs_notification ON public.admin_notification_logs(notification_id);