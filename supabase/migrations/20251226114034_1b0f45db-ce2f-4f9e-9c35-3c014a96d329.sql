-- =============================================
-- CHECKOUT SESSIONS & EVENTS TABLES
-- =============================================

-- Checkout session status enum
CREATE TYPE public.checkout_session_status AS ENUM (
  'active',
  'expired',
  'completed',
  'failed',
  'abandoned'
);

-- Checkout step enum
CREATE TYPE public.checkout_step AS ENUM (
  'login',
  'address',
  'payment',
  'confirmation'
);

-- Payment method enum for checkout
CREATE TYPE public.checkout_payment_method AS ENUM (
  'upi',
  'card',
  'wallet',
  'emi',
  'cod',
  'netbanking'
);

-- =============================================
-- CHECKOUT SESSIONS TABLE
-- =============================================
CREATE TABLE public.checkout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Session identification
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Cart & order data
  cart_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  cart_total NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  shipping_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Session state
  status public.checkout_session_status NOT NULL DEFAULT 'active',
  current_step public.checkout_step NOT NULL DEFAULT 'login',
  
  -- User identification (for guest or pre-login)
  phone_number TEXT,
  email TEXT,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  otp_verified BOOLEAN NOT NULL DEFAULT false,
  otp_sent_at TIMESTAMPTZ,
  otp_attempts INTEGER NOT NULL DEFAULT 0,
  
  -- Address data
  shipping_address_id UUID,
  shipping_name TEXT,
  shipping_address JSONB,
  shipping_pincode TEXT,
  delivery_estimate TEXT,
  cod_available BOOLEAN NOT NULL DEFAULT true,
  
  -- Payment data
  selected_payment_method public.checkout_payment_method,
  payment_attempts INTEGER NOT NULL DEFAULT 0,
  last_payment_error TEXT,
  cod_verification_required BOOLEAN NOT NULL DEFAULT false,
  cod_fee NUMERIC NOT NULL DEFAULT 0,
  
  -- Order linkage (after completion)
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id UUID,
  
  -- Device & security
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_checkout_sessions_merchant ON public.checkout_sessions(merchant_id);
CREATE INDEX idx_checkout_sessions_user ON public.checkout_sessions(user_id);
CREATE INDEX idx_checkout_sessions_status ON public.checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_phone ON public.checkout_sessions(phone_number);
CREATE INDEX idx_checkout_sessions_created ON public.checkout_sessions(created_at DESC);
CREATE INDEX idx_checkout_sessions_expires ON public.checkout_sessions(expires_at) WHERE status = 'active';

-- =============================================
-- CHECKOUT EVENTS TABLE (Audit trail)
-- =============================================
CREATE TABLE public.checkout_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  
  step public.checkout_step,
  previous_step public.checkout_step,
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkout_events_session ON public.checkout_events(session_id);
CREATE INDEX idx_checkout_events_type ON public.checkout_events(event_type);
CREATE INDEX idx_checkout_events_created ON public.checkout_events(created_at DESC);

-- =============================================
-- CHECKOUT ATTEMPTS TABLE (Payment attempts)
-- =============================================
CREATE TABLE public.checkout_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  
  payment_method public.checkout_payment_method NOT NULL,
  gateway TEXT,
  
  amount NUMERIC NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'initiated',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  
  error_code TEXT,
  error_message TEXT,
  
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_checkout_attempts_session ON public.checkout_attempts(session_id);
CREATE INDEX idx_checkout_attempts_status ON public.checkout_attempts(status);

-- =============================================
-- CHECKOUT RISK FLAGS TABLE
-- =============================================
CREATE TABLE public.checkout_risk_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT,
  
  auto_blocked BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkout_risk_session ON public.checkout_risk_flags(session_id);
CREATE INDEX idx_checkout_risk_type ON public.checkout_risk_flags(flag_type);

-- =============================================
-- CUSTOMER ADDRESSES TABLE
-- =============================================
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  label TEXT NOT NULL DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_addresses_user ON public.customer_addresses(user_id);
CREATE INDEX idx_customer_addresses_default ON public.customer_addresses(user_id, is_default) WHERE is_default = true;

-- =============================================
-- PINCODE SERVICEABILITY TABLE
-- =============================================
CREATE TABLE public.pincode_serviceability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pincode TEXT NOT NULL UNIQUE,
  
  city TEXT,
  state TEXT,
  
  is_serviceable BOOLEAN NOT NULL DEFAULT true,
  cod_available BOOLEAN NOT NULL DEFAULT true,
  prepaid_available BOOLEAN NOT NULL DEFAULT true,
  
  delivery_days_min INTEGER NOT NULL DEFAULT 3,
  delivery_days_max INTEGER NOT NULL DEFAULT 7,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pincode_serviceability_pincode ON public.pincode_serviceability(pincode);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincode_serviceability ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - CHECKOUT SESSIONS
-- =============================================

-- Users can view their own sessions
CREATE POLICY "Users can view their own checkout sessions"
ON public.checkout_sessions FOR SELECT
USING (user_id = auth.uid() OR phone_number = (SELECT phone FROM auth.users WHERE id = auth.uid()));

-- Users can update their own active sessions
CREATE POLICY "Users can update their own active sessions"
ON public.checkout_sessions FOR UPDATE
USING (
  (user_id = auth.uid() OR (user_id IS NULL AND status = 'active'))
  AND status IN ('active')
);

-- Anyone can create a checkout session (guest checkout)
CREATE POLICY "Anyone can create checkout sessions"
ON public.checkout_sessions FOR INSERT
WITH CHECK (true);

-- Merchants can view sessions for their store
CREATE POLICY "Merchants can view their checkout sessions"
ON public.checkout_sessions FOR SELECT
USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

-- Admins can view all sessions
CREATE POLICY "Admins can view all checkout sessions"
ON public.checkout_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update any session
CREATE POLICY "Admins can update all checkout sessions"
ON public.checkout_sessions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - CHECKOUT EVENTS
-- =============================================

-- Users can view events for their sessions
CREATE POLICY "Users can view their checkout events"
ON public.checkout_events FOR SELECT
USING (session_id IN (
  SELECT id FROM public.checkout_sessions 
  WHERE user_id = auth.uid()
));

-- System can insert events
CREATE POLICY "System can insert checkout events"
ON public.checkout_events FOR INSERT
WITH CHECK (true);

-- Merchants can view events for their sessions
CREATE POLICY "Merchants can view their checkout events"
ON public.checkout_events FOR SELECT
USING (session_id IN (
  SELECT cs.id FROM public.checkout_sessions cs
  JOIN public.merchants m ON m.id = cs.merchant_id
  WHERE m.user_id = auth.uid()
));

-- Admins can view all events
CREATE POLICY "Admins can view all checkout events"
ON public.checkout_events FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - CHECKOUT ATTEMPTS
-- =============================================

-- Users can view attempts for their sessions
CREATE POLICY "Users can view their checkout attempts"
ON public.checkout_attempts FOR SELECT
USING (session_id IN (
  SELECT id FROM public.checkout_sessions 
  WHERE user_id = auth.uid()
));

-- System can insert attempts
CREATE POLICY "System can insert checkout attempts"
ON public.checkout_attempts FOR INSERT
WITH CHECK (true);

-- System can update attempts
CREATE POLICY "System can update checkout attempts"
ON public.checkout_attempts FOR UPDATE
USING (true);

-- Merchants can view attempts for their sessions
CREATE POLICY "Merchants can view their checkout attempts"
ON public.checkout_attempts FOR SELECT
USING (session_id IN (
  SELECT cs.id FROM public.checkout_sessions cs
  JOIN public.merchants m ON m.id = cs.merchant_id
  WHERE m.user_id = auth.uid()
));

-- Admins can view all attempts
CREATE POLICY "Admins can view all checkout attempts"
ON public.checkout_attempts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - CHECKOUT RISK FLAGS
-- =============================================

-- Admins can manage risk flags
CREATE POLICY "Admins can manage checkout risk flags"
ON public.checkout_risk_flags FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- System can insert risk flags
CREATE POLICY "System can insert checkout risk flags"
ON public.checkout_risk_flags FOR INSERT
WITH CHECK (true);

-- =============================================
-- RLS POLICIES - CUSTOMER ADDRESSES
-- =============================================

-- Users can manage their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.customer_addresses FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own addresses"
ON public.customer_addresses FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own addresses"
ON public.customer_addresses FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own addresses"
ON public.customer_addresses FOR DELETE
USING (user_id = auth.uid());

-- Admins can view all addresses
CREATE POLICY "Admins can view all addresses"
ON public.customer_addresses FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - PINCODE SERVICEABILITY
-- =============================================

-- Anyone can view pincode serviceability
CREATE POLICY "Anyone can view pincode serviceability"
ON public.pincode_serviceability FOR SELECT
USING (true);

-- Only admins can manage pincode serviceability
CREATE POLICY "Admins can manage pincode serviceability"
ON public.pincode_serviceability FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at
CREATE TRIGGER update_checkout_sessions_updated_at
  BEFORE UPDATE ON public.checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- REALTIME
-- =============================================
ALTER TABLE public.checkout_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.checkout_events REPLICA IDENTITY FULL;
ALTER TABLE public.checkout_attempts REPLICA IDENTITY FULL;

-- Insert sample pincode data for testing
INSERT INTO public.pincode_serviceability (pincode, city, state, is_serviceable, cod_available, delivery_days_min, delivery_days_max) VALUES
('110001', 'New Delhi', 'Delhi', true, true, 2, 4),
('400001', 'Mumbai', 'Maharashtra', true, true, 2, 4),
('560001', 'Bangalore', 'Karnataka', true, true, 2, 5),
('500001', 'Hyderabad', 'Telangana', true, true, 3, 5),
('600001', 'Chennai', 'Tamil Nadu', true, true, 3, 5),
('700001', 'Kolkata', 'West Bengal', true, true, 3, 6),
('380001', 'Ahmedabad', 'Gujarat', true, true, 3, 5),
('411001', 'Pune', 'Maharashtra', true, true, 2, 4),
('302001', 'Jaipur', 'Rajasthan', true, true, 3, 6),
('226001', 'Lucknow', 'Uttar Pradesh', true, true, 3, 6)
ON CONFLICT (pincode) DO NOTHING;