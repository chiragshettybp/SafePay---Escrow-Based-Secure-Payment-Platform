-- Create table for merchant integration checklist
CREATE TABLE IF NOT EXISTS public.merchant_integration_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES auth.users(id),
  api_key_generated BOOLEAN NOT NULL DEFAULT false,
  api_key_generated_at TIMESTAMPTZ,
  checkout_tested BOOLEAN NOT NULL DEFAULT false,
  checkout_tested_at TIMESTAMPTZ,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  webhook_configured_at TIMESTAMPTZ,
  live_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  live_mode_enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_merchant_checklist UNIQUE (merchant_id)
);

-- Enable RLS
ALTER TABLE public.merchant_integration_checklist ENABLE ROW LEVEL SECURITY;

-- RLS policies for merchant_integration_checklist
CREATE POLICY "Merchants can view their own checklist"
  ON public.merchant_integration_checklist
  FOR SELECT
  USING (merchant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can insert their own checklist"
  ON public.merchant_integration_checklist
  FOR INSERT
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can update their own checklist"
  ON public.merchant_integration_checklist
  FOR UPDATE
  USING (merchant_id = auth.uid());

-- Create index
CREATE INDEX idx_merchant_integration_checklist_merchant ON public.merchant_integration_checklist(merchant_id);