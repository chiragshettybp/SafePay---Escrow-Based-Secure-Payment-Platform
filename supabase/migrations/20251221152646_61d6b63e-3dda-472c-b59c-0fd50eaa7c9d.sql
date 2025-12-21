-- Create merchants table
CREATE TABLE public.merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  category TEXT,
  gst_number TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Merchants can view their own profile"
ON public.merchants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Merchants can update their own profile"
ON public.merchants
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create a merchant profile during signup"
ON public.merchants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_merchants_updated_at
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add merchant role when merchant profile is created
CREATE OR REPLACE FUNCTION public.handle_new_merchant()
RETURNS TRIGGER AS $$
BEGIN
  -- Add merchant role to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'merchant')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to add merchant role on merchant creation
CREATE TRIGGER on_merchant_created
AFTER INSERT ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_merchant();