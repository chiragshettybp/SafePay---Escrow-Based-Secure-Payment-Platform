-- Create merchant checkout configuration table
CREATE TABLE public.merchant_checkout_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE,
  
  -- Login settings
  login_otp_enabled BOOLEAN NOT NULL DEFAULT true,
  login_guest_checkout_enabled BOOLEAN NOT NULL DEFAULT false,
  login_returning_user_autologin BOOLEAN NOT NULL DEFAULT true,
  login_require_before_payment BOOLEAN NOT NULL DEFAULT true,
  login_otp_retry_limit INTEGER NOT NULL DEFAULT 3,
  login_otp_cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  login_guest_max_order_value NUMERIC NOT NULL DEFAULT 5000,
  login_autolink_by_phone BOOLEAN NOT NULL DEFAULT true,
  
  -- Payment method ordering (array of method names in order)
  payment_methods_order TEXT[] NOT NULL DEFAULT ARRAY['upi', 'cards', 'wallets', 'emi', 'netbanking'],
  payment_upi_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_cards_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_wallets_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_emi_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_netbanking_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_reorder_by_success_rate BOOLEAN NOT NULL DEFAULT false,
  payment_reorder_by_device BOOLEAN NOT NULL DEFAULT false,
  payment_reorder_by_value BOOLEAN NOT NULL DEFAULT false,
  
  -- Prepaid nudges
  prepaid_nudges_enabled BOOLEAN NOT NULL DEFAULT false,
  prepaid_discount_enabled BOOLEAN NOT NULL DEFAULT false,
  prepaid_urgency_enabled BOOLEAN NOT NULL DEFAULT false,
  prepaid_discount_type TEXT NOT NULL DEFAULT 'percentage',
  prepaid_discount_value NUMERIC NOT NULL DEFAULT 5,
  prepaid_message TEXT NOT NULL DEFAULT 'Pay online and save!',
  prepaid_min_order_value NUMERIC NOT NULL DEFAULT 0,
  prepaid_first_time_only BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_checkout_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own config"
ON public.merchant_checkout_config FOR SELECT
USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can insert their own config"
ON public.merchant_checkout_config FOR INSERT
WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can update their own config"
ON public.merchant_checkout_config FOR UPDATE
USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all configs"
ON public.merchant_checkout_config FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create audit log table for settings changes
CREATE TABLE public.merchant_checkout_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES merchant_checkout_config(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  change_type TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit
ALTER TABLE public.merchant_checkout_config_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their own audit"
ON public.merchant_checkout_config_audit FOR SELECT
USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "System can insert audit"
ON public.merchant_checkout_config_audit FOR INSERT
WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_checkout_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_merchant_checkout_config_timestamp
BEFORE UPDATE ON public.merchant_checkout_config
FOR EACH ROW EXECUTE FUNCTION update_checkout_config_timestamp();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_checkout_config;