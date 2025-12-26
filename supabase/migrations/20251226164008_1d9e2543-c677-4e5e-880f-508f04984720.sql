-- Payment Links: Enable full replica identity for realtime updates
ALTER TABLE public.payment_links REPLICA IDENTITY FULL;

-- Add check constraint for positive amount
ALTER TABLE public.payment_links 
ADD CONSTRAINT payment_links_amount_positive CHECK (amount > 0);

-- Add foreign key constraint if not exists (already exists based on types, but ensure it's enforced)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payment_links_merchant_id_fkey' 
    AND table_name = 'payment_links'
  ) THEN
    ALTER TABLE public.payment_links 
    ADD CONSTRAINT payment_links_merchant_id_fkey 
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create function to update payment link totals when a payment succeeds
CREATE OR REPLACE FUNCTION public.update_payment_link_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_payment_link_id UUID;
BEGIN
  -- Only act on successful payments
  IF NEW.status = 'success' AND (OLD IS NULL OR OLD.status != 'success') THEN
    -- Get payment link ID from checkout session
    SELECT payment_link_id INTO v_payment_link_id
    FROM public.checkout_sessions
    WHERE id = NEW.checkout_session_id;
    
    -- Update payment link totals if this payment is from a payment link
    IF v_payment_link_id IS NOT NULL THEN
      UPDATE public.payment_links
      SET 
        total_payments = total_payments + 1,
        total_collected = total_collected + NEW.amount,
        updated_at = now()
      WHERE id = v_payment_link_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment link totals update
DROP TRIGGER IF EXISTS update_payment_link_totals_trigger ON public.payments;
CREATE TRIGGER update_payment_link_totals_trigger
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_link_totals();

-- Create function to auto-expire payment links
CREATE OR REPLACE FUNCTION public.check_payment_link_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- If link has expiry and is expired, set status to expired
  IF NEW.expires_at IS NOT NULL 
     AND NEW.expires_at < now() 
     AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to check expiry on read/update
DROP TRIGGER IF EXISTS check_payment_link_expiry_trigger ON public.payment_links;
CREATE TRIGGER check_payment_link_expiry_trigger
  BEFORE UPDATE ON public.payment_links
  FOR EACH ROW
  EXECUTE FUNCTION public.check_payment_link_expiry();

-- Create function to validate payment link on checkout session creation
CREATE OR REPLACE FUNCTION public.validate_payment_link_session()
RETURNS TRIGGER AS $$
DECLARE
  v_link RECORD;
BEGIN
  -- Only validate if payment_link_id is set
  IF NEW.payment_link_id IS NOT NULL THEN
    SELECT * INTO v_link FROM public.payment_links WHERE id = NEW.payment_link_id;
    
    IF v_link IS NULL THEN
      RAISE EXCEPTION 'Payment link not found: %', NEW.payment_link_id;
    END IF;
    
    IF v_link.status != 'active' THEN
      RAISE EXCEPTION 'Payment link is not active: % (status: %)', NEW.payment_link_id, v_link.status;
    END IF;
    
    IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
      -- Auto-expire the link
      UPDATE public.payment_links SET status = 'expired', updated_at = now() WHERE id = NEW.payment_link_id;
      RAISE EXCEPTION 'Payment link has expired: %', NEW.payment_link_id;
    END IF;
    
    -- Validate merchant matches
    IF v_link.merchant_id != NEW.merchant_id THEN
      RAISE EXCEPTION 'Payment link merchant mismatch';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to validate payment link on session creation
DROP TRIGGER IF EXISTS validate_payment_link_session_trigger ON public.checkout_sessions;
CREATE TRIGGER validate_payment_link_session_trigger
  BEFORE INSERT ON public.checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_link_session();

-- Add payment_links to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_links;