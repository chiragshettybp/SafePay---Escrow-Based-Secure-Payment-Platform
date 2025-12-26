-- Add slug column to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_merchants_slug ON public.merchants(slug);

-- Create function to generate slug from business name
CREATE OR REPLACE FUNCTION public.generate_merchant_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from business name
  base_slug := lower(regexp_replace(NEW.business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- If slug is already set, don't override
  IF NEW.slug IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  new_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.merchants WHERE slug = new_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := new_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-generating slug
DROP TRIGGER IF EXISTS set_merchant_slug ON public.merchants;
CREATE TRIGGER set_merchant_slug
  BEFORE INSERT OR UPDATE ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_merchant_slug();

-- Update existing merchants with slugs
UPDATE public.merchants 
SET slug = lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Create payment_links table
CREATE TABLE public.payment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  expires_at TIMESTAMP WITH TIME ZONE,
  success_redirect_url TEXT,
  cancel_redirect_url TEXT,
  link_code TEXT NOT NULL UNIQUE,
  total_payments INTEGER NOT NULL DEFAULT 0,
  total_collected NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for link_code lookups
CREATE UNIQUE INDEX idx_payment_links_link_code ON public.payment_links(link_code);
CREATE INDEX idx_payment_links_merchant ON public.payment_links(merchant_id);
CREATE INDEX idx_payment_links_status ON public.payment_links(status);

-- Add payment_link_id to checkout_sessions
ALTER TABLE public.checkout_sessions 
ADD COLUMN IF NOT EXISTS payment_link_id UUID REFERENCES public.payment_links(id);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_payment_link ON public.checkout_sessions(payment_link_id);

-- Enable RLS on payment_links
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_links
CREATE POLICY "Merchants can view their own payment links"
  ON public.payment_links
  FOR SELECT
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can create payment links"
  ON public.payment_links
  FOR INSERT
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can update their own payment links"
  ON public.payment_links
  FOR UPDATE
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can delete their own payment links"
  ON public.payment_links
  FOR DELETE
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all payment links"
  ON public.payment_links
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all payment links"
  ON public.payment_links
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active payment links by code"
  ON public.payment_links
  FOR SELECT
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));

-- Function to generate unique link code
CREATE OR REPLACE FUNCTION public.generate_payment_link_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NEW.link_code IS NULL THEN
    new_code := 'PLINK_' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    WHILE EXISTS (SELECT 1 FROM public.payment_links WHERE link_code = new_code) LOOP
      new_code := 'PLINK_' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    END LOOP;
    
    NEW.link_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-generating link code
CREATE TRIGGER set_payment_link_code
  BEFORE INSERT ON public.payment_links
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_payment_link_code();

-- Function to update payment link stats
CREATE OR REPLACE FUNCTION public.update_payment_link_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NEW.payment_link_id IS NOT NULL THEN
      UPDATE public.payment_links
      SET 
        total_payments = total_payments + 1,
        total_collected = total_collected + NEW.final_amount,
        updated_at = now()
      WHERE id = NEW.payment_link_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updating payment link stats
DROP TRIGGER IF EXISTS update_payment_link_stats_trigger ON public.checkout_sessions;
CREATE TRIGGER update_payment_link_stats_trigger
  AFTER UPDATE ON public.checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_link_stats();

-- Create payment_link_audit_log table for tracking changes
CREATE TABLE public.payment_link_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_link_id UUID NOT NULL REFERENCES public.payment_links(id),
  merchant_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_link_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their audit logs"
  ON public.payment_link_audit_log
  FOR SELECT
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.payment_link_audit_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all audit logs"
  ON public.payment_link_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));