-- Create platform_checkout_settings table
CREATE TABLE public.platform_checkout_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'string', -- string, boolean, number
  description TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create otp_settings table
CREATE TABLE public.otp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  otp_enabled BOOLEAN NOT NULL DEFAULT true,
  require_otp_before_payment BOOLEAN NOT NULL DEFAULT true,
  otp_length INTEGER NOT NULL DEFAULT 6,
  otp_expiry_seconds INTEGER NOT NULL DEFAULT 300,
  max_retries_per_otp INTEGER NOT NULL DEFAULT 3,
  cooldown_between_sends_seconds INTEGER NOT NULL DEFAULT 60,
  lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
  max_otp_requests_per_phone_hourly INTEGER NOT NULL DEFAULT 10,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  block_phone_after_failures BOOLEAN NOT NULL DEFAULT true,
  block_ip_after_abuse BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create checkout_settings_audit table
CREATE TABLE public.checkout_settings_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_table TEXT NOT NULL,
  setting_key TEXT,
  previous_value JSONB,
  new_value JSONB,
  change_reason TEXT,
  admin_id UUID NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_checkout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_settings_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_checkout_settings
CREATE POLICY "Admins can manage platform checkout settings" ON public.platform_checkout_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read platform checkout settings" ON public.platform_checkout_settings
  FOR SELECT USING (true);

-- RLS Policies for otp_settings
CREATE POLICY "Admins can manage otp settings" ON public.otp_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can read otp settings" ON public.otp_settings
  FOR SELECT USING (true);

-- RLS Policies for checkout_settings_audit
CREATE POLICY "Admins can view settings audit" ON public.checkout_settings_audit
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert settings audit" ON public.checkout_settings_audit
  FOR INSERT WITH CHECK (true);

-- Insert default platform settings
INSERT INTO public.platform_checkout_settings (setting_key, setting_value, setting_type, description, is_locked) VALUES
  ('payment_mode', 'prepaid_only', 'string', 'Payment mode for checkout. This is locked to prepaid only.', true),
  ('cod_enabled', 'false', 'boolean', 'COD is permanently disabled on this platform.', true),
  ('require_auth_before_payment', 'true', 'boolean', 'Require user authentication before payment', false),
  ('allow_guest_checkout', 'true', 'boolean', 'Allow guest checkout without account', false),
  ('max_session_duration_minutes', '30', 'number', 'Maximum checkout session duration in minutes', false),
  ('max_payment_retries', '3', 'number', 'Maximum payment retry attempts per session', false),
  ('auto_expire_inactive_sessions', 'true', 'boolean', 'Automatically expire inactive checkout sessions', false),
  ('max_sessions_per_ip_hourly', '50', 'number', 'Maximum checkout sessions per IP address per hour', false),
  ('cooldown_after_failures_seconds', '300', 'number', 'Cooldown period after repeated payment failures', false);

-- Insert default OTP settings (single row config)
INSERT INTO public.otp_settings (id) VALUES (gen_random_uuid());

-- Create indexes
CREATE INDEX idx_platform_settings_key ON public.platform_checkout_settings(setting_key);
CREATE INDEX idx_checkout_audit_admin ON public.checkout_settings_audit(admin_id);
CREATE INDEX idx_checkout_audit_created ON public.checkout_settings_audit(created_at DESC);