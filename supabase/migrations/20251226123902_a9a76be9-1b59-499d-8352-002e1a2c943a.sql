-- Create merchant_integrations table
CREATE TABLE IF NOT EXISTS public.merchant_integrations (
  merchant_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_status TEXT NOT NULL DEFAULT 'not_connected' CHECK (integration_status IN ('connected', 'not_connected')),
  test_mode_enabled BOOLEAN NOT NULL DEFAULT true,
  live_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  last_test_at TIMESTAMP WITH TIME ZONE,
  last_live_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to merchant_api_keys if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_api_keys' AND column_name = 'key_type') THEN
    ALTER TABLE public.merchant_api_keys ADD COLUMN key_type TEXT NOT NULL DEFAULT 'secret' CHECK (key_type IN ('public', 'secret'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_api_keys' AND column_name = 'environment') THEN
    ALTER TABLE public.merchant_api_keys ADD COLUMN environment TEXT NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'live'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_api_keys' AND column_name = 'status') THEN
    ALTER TABLE public.merchant_api_keys ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked'));
  END IF;
END $$;

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.merchant_webhooks(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_code INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  error_message TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create api_key_audit_log table
CREATE TABLE IF NOT EXISTS public.api_key_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  api_key_id UUID,
  action TEXT NOT NULL CHECK (action IN ('generated', 'rotated', 'revoked', 'copied', 'used')),
  key_prefix TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.merchant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for merchant_integrations
CREATE POLICY "Merchants can view their own integration" ON public.merchant_integrations
  FOR SELECT USING (merchant_id = auth.uid());
  
CREATE POLICY "Merchants can update their own integration" ON public.merchant_integrations
  FOR UPDATE USING (merchant_id = auth.uid());

CREATE POLICY "System can insert integrations" ON public.merchant_integrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all integrations" ON public.merchant_integrations
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS for webhook_deliveries
CREATE POLICY "Merchants can view their webhook deliveries" ON public.webhook_deliveries
  FOR SELECT USING (merchant_id = auth.uid());

CREATE POLICY "System can insert webhook deliveries" ON public.webhook_deliveries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update webhook deliveries" ON public.webhook_deliveries
  FOR UPDATE USING (true);

CREATE POLICY "Admins can view all webhook deliveries" ON public.webhook_deliveries
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS for api_key_audit_log
CREATE POLICY "Merchants can view their audit log" ON public.api_key_audit_log
  FOR SELECT USING (merchant_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON public.api_key_audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all audit logs" ON public.api_key_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON public.webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_merchant ON public.webhook_deliveries(merchant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_api_key_audit_merchant ON public.api_key_audit_log(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_api_keys_merchant ON public.merchant_api_keys(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_api_keys_status ON public.merchant_api_keys(status);

-- Function to update merchant_integrations timestamp
CREATE OR REPLACE FUNCTION public.update_merchant_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for updating timestamp
DROP TRIGGER IF EXISTS update_merchant_integrations_timestamp ON public.merchant_integrations;
CREATE TRIGGER update_merchant_integrations_timestamp
  BEFORE UPDATE ON public.merchant_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_merchant_integration_timestamp();