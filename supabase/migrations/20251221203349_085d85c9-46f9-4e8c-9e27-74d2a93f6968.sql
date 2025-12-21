-- =====================================================
-- MERCHANT NOTIFICATIONS & SETTINGS SYSTEM
-- =====================================================

-- 1. Merchant Notifications Table
CREATE TABLE IF NOT EXISTS public.merchant_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- order, payment, dispute, refund, payout, kyc, admin, system
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'unread', -- unread, read, archived, deleted
  priority TEXT NOT NULL DEFAULT 'normal', -- normal, urgent
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_notifications
CREATE POLICY "Merchants can view their own notifications"
  ON public.merchant_notifications FOR SELECT
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update their own notifications"
  ON public.merchant_notifications FOR UPDATE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "System can insert merchant notifications"
  ON public.merchant_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Merchants can delete their own notifications"
  ON public.merchant_notifications FOR DELETE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

-- Indexes for performance
CREATE INDEX idx_merchant_notifications_merchant_id ON public.merchant_notifications(merchant_id);
CREATE INDEX idx_merchant_notifications_status ON public.merchant_notifications(status);
CREATE INDEX idx_merchant_notifications_created_at ON public.merchant_notifications(created_at DESC);

-- 2. Merchant Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.merchant_notification_prefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL UNIQUE,
  order_in_app BOOLEAN NOT NULL DEFAULT true,
  order_email BOOLEAN NOT NULL DEFAULT true,
  order_sms BOOLEAN NOT NULL DEFAULT false,
  payment_in_app BOOLEAN NOT NULL DEFAULT true,
  payment_email BOOLEAN NOT NULL DEFAULT true,
  payment_sms BOOLEAN NOT NULL DEFAULT false,
  dispute_in_app BOOLEAN NOT NULL DEFAULT true,
  dispute_email BOOLEAN NOT NULL DEFAULT true,
  dispute_sms BOOLEAN NOT NULL DEFAULT true,
  payout_in_app BOOLEAN NOT NULL DEFAULT true,
  payout_email BOOLEAN NOT NULL DEFAULT true,
  payout_sms BOOLEAN NOT NULL DEFAULT false,
  system_in_app BOOLEAN NOT NULL DEFAULT true,
  system_email BOOLEAN NOT NULL DEFAULT false,
  system_sms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_notification_prefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own notification prefs"
  ON public.merchant_notification_prefs FOR SELECT
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can insert their own notification prefs"
  ON public.merchant_notification_prefs FOR INSERT
  WITH CHECK (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update their own notification prefs"
  ON public.merchant_notification_prefs FOR UPDATE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

-- 3. Merchant Webhooks Table
CREATE TABLE IF NOT EXISTS public.merchant_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own webhooks"
  ON public.merchant_webhooks FOR SELECT
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can create their own webhooks"
  ON public.merchant_webhooks FOR INSERT
  WITH CHECK (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update their own webhooks"
  ON public.merchant_webhooks FOR UPDATE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can delete their own webhooks"
  ON public.merchant_webhooks FOR DELETE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

-- 4. Merchant API Keys Table
CREATE TABLE IF NOT EXISTS public.merchant_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  key_hash TEXT NOT NULL, -- Hashed key for verification
  scopes TEXT[] NOT NULL DEFAULT '{"read"}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own API keys"
  ON public.merchant_api_keys FOR SELECT
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can create their own API keys"
  ON public.merchant_api_keys FOR INSERT
  WITH CHECK (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update their own API keys"
  ON public.merchant_api_keys FOR UPDATE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can delete their own API keys"
  ON public.merchant_api_keys FOR DELETE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

-- 5. Enable Realtime for merchant_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_notifications;

-- 6. Update timestamp trigger for notification prefs
CREATE TRIGGER update_merchant_notification_prefs_updated_at
  BEFORE UPDATE ON public.merchant_notification_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Update timestamp trigger for webhooks
CREATE TRIGGER update_merchant_webhooks_updated_at
  BEFORE UPDATE ON public.merchant_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();