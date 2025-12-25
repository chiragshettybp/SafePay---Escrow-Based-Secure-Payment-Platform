-- Add order_settings table for configurable settings
CREATE TABLE IF NOT EXISTS public.order_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage order settings" 
ON public.order_settings FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read order settings" 
ON public.order_settings FOR SELECT 
USING (true);

-- Insert default settings
INSERT INTO public.order_settings (setting_key, setting_value, description) VALUES
  ('min_order_amount', '100', 'Minimum order amount in INR'),
  ('auto_confirm_days', '7', 'Days after delivery to auto-confirm order'),
  ('dispute_window_days', '30', 'Days after delivery within which disputes can be raised'),
  ('high_value_threshold', '50000', 'Amount threshold requiring dual admin approval')
ON CONFLICT (setting_key) DO NOTHING;