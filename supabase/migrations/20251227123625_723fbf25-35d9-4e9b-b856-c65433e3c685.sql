-- =====================================================
-- MIGRATION: Phone-Based Claimable Accounts System
-- =====================================================

-- 1. Add new fields to profiles table for account source tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_source TEXT DEFAULT 'direct_signup',
ADD COLUMN IF NOT EXISTS account_claimed BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- Add constraint for valid account sources
ALTER TABLE public.profiles 
ADD CONSTRAINT check_account_source 
CHECK (account_source IN ('direct_signup', 'payment_link', 'merchant_invite', 'admin_created'));

-- Add constraint for valid auth providers
ALTER TABLE public.profiles 
ADD CONSTRAINT check_auth_provider 
CHECK (auth_provider IN ('email', 'phone', 'both', 'payment_link', 'google', 'apple'));

-- Update existing profiles to mark as claimed with direct signup
UPDATE public.profiles 
SET account_source = 'direct_signup', account_claimed = TRUE, auth_provider = 'email'
WHERE account_source IS NULL OR account_claimed IS NULL;

-- 2. Add phone_snapshot to orders table to store phone at payment time
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS phone_snapshot TEXT;

-- 3. Add phone_snapshot to checkout_sessions for tracking
ALTER TABLE public.checkout_sessions 
ADD COLUMN IF NOT EXISTS phone_snapshot TEXT;

-- 4. Create payment_link_user_associations table for audit logging
CREATE TABLE IF NOT EXISTS public.payment_link_user_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id),
  checkout_session_id UUID REFERENCES public.checkout_sessions(id),
  order_id UUID REFERENCES public.orders(id),
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  association_type TEXT NOT NULL CHECK (association_type IN ('created', 'existing')),
  payment_link_id UUID REFERENCES public.payment_links(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on the audit table
ALTER TABLE public.payment_link_user_associations ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_link_user_associations
CREATE POLICY "Admins can view all associations" ON public.payment_link_user_associations
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their payment link associations" ON public.payment_link_user_associations
  FOR SELECT USING (
    payment_link_id IN (
      SELECT id FROM payment_links WHERE merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert associations" ON public.payment_link_user_associations
  FOR INSERT WITH CHECK (true);

-- 5. Create index for faster phone lookups (unique constraint already exists on phone)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_lookup ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_account_source ON public.profiles(account_source);
CREATE INDEX IF NOT EXISTS idx_profiles_unclaimed ON public.profiles(account_claimed) WHERE account_claimed = FALSE;

-- 6. Create index on orders for phone_snapshot
CREATE INDEX IF NOT EXISTS idx_orders_phone_snapshot ON public.orders(phone_snapshot) WHERE phone_snapshot IS NOT NULL;

-- 7. Add comment for documentation
COMMENT ON COLUMN public.profiles.account_source IS 'How the account was created: direct_signup, payment_link, merchant_invite, admin_created';
COMMENT ON COLUMN public.profiles.account_claimed IS 'Whether user has explicitly set a password and claimed their account';
COMMENT ON COLUMN public.profiles.auth_provider IS 'Primary authentication method: email, phone, both, payment_link, google, apple';
COMMENT ON COLUMN public.orders.phone_snapshot IS 'Phone number used at time of payment (immutable for audit)';
COMMENT ON TABLE public.payment_link_user_associations IS 'Audit log for user associations via public payment links';