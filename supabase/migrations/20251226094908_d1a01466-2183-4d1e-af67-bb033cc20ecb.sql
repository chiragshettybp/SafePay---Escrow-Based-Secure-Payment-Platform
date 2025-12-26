
-- =============================================================================
-- DISPUTE FAIRNESS & FUND PROTECTION MIGRATION
-- Purpose: Enforce immutability, mutual exclusivity, and atomic dispute operations
-- =============================================================================

-- ============================================================
-- 1. ENFORCE EVIDENCE IMMUTABILITY
-- ============================================================

-- 1a. Prevent UPDATE/DELETE on dispute_files (customer evidence)
CREATE OR REPLACE FUNCTION public.enforce_dispute_files_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'EVIDENCE_IMMUTABLE: Dispute files cannot be modified after submission. File ID: %', OLD.id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only allow admin deletion
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'EVIDENCE_IMMUTABLE: Dispute files cannot be deleted. Admin intervention required. File ID: %', OLD.id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_dispute_files_immutable ON public.dispute_files;
CREATE TRIGGER trigger_dispute_files_immutable
  BEFORE UPDATE OR DELETE ON public.dispute_files
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dispute_files_immutable();

-- 1b. Prevent UPDATE/DELETE on merchant_evidence
CREATE OR REPLACE FUNCTION public.enforce_merchant_evidence_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'EVIDENCE_IMMUTABLE: Merchant evidence cannot be modified after submission. Evidence ID: %', OLD.id;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'EVIDENCE_IMMUTABLE: Merchant evidence cannot be deleted. Admin intervention required. Evidence ID: %', OLD.id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_merchant_evidence_immutable ON public.merchant_evidence;
CREATE TRIGGER trigger_merchant_evidence_immutable
  BEFORE UPDATE OR DELETE ON public.merchant_evidence
  FOR EACH ROW EXECUTE FUNCTION public.enforce_merchant_evidence_immutable();

-- 1c. Prevent UPDATE/DELETE on dispute_responses (merchant responses)
CREATE OR REPLACE FUNCTION public.enforce_dispute_responses_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'RESPONSE_IMMUTABLE: Dispute responses cannot be modified after submission. Response ID: %', OLD.id;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'RESPONSE_IMMUTABLE: Dispute responses cannot be deleted. Admin intervention required. Response ID: %', OLD.id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_dispute_responses_immutable ON public.dispute_responses;
CREATE TRIGGER trigger_dispute_responses_immutable
  BEFORE UPDATE OR DELETE ON public.dispute_responses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dispute_responses_immutable();

-- 1d. Prevent UPDATE/DELETE on dispute_comments
CREATE OR REPLACE FUNCTION public.enforce_dispute_comments_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'COMMENT_IMMUTABLE: Dispute comments cannot be modified after submission. Comment ID: %', OLD.id;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'COMMENT_IMMUTABLE: Dispute comments cannot be deleted. Admin intervention required. Comment ID: %', OLD.id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_dispute_comments_immutable ON public.dispute_comments;
CREATE TRIGGER trigger_dispute_comments_immutable
  BEFORE UPDATE OR DELETE ON public.dispute_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dispute_comments_immutable();

-- 1e. Prevent UPDATE/DELETE on dispute_updates (timeline entries)
CREATE OR REPLACE FUNCTION public.enforce_dispute_updates_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'TIMELINE_IMMUTABLE: Dispute timeline entries cannot be modified. Entry ID: %', OLD.id;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'TIMELINE_IMMUTABLE: Dispute timeline entries cannot be deleted. Entry ID: %', OLD.id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_dispute_updates_immutable ON public.dispute_updates;
CREATE TRIGGER trigger_dispute_updates_immutable
  BEFORE UPDATE OR DELETE ON public.dispute_updates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dispute_updates_immutable();

-- ============================================================
-- 2. ENFORCE SINGLE ACTIVE DISPUTE PER ORDER
-- ============================================================

-- Create unique partial index to ensure only one open/under_review dispute per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_single_active_per_order 
ON public.disputes (order_id)
WHERE status IN ('open', 'under_review');

-- ============================================================
-- 3. ENFORCE ESCROW FREEZE DURING ACTIVE DISPUTES
-- ============================================================

-- 3a. Create function to block escrow modifications during active disputes
CREATE OR REPLACE FUNCTION public.block_escrow_during_dispute()
RETURNS TRIGGER AS $$
DECLARE
  has_active_dispute BOOLEAN;
  dispute_order_id UUID;
BEGIN
  -- Check if any order linked to this escrow account has an active dispute
  SELECT EXISTS (
    SELECT 1 
    FROM public.orders o
    JOIN public.disputes d ON d.order_id = o.id
    WHERE o.merchant_id = NEW.merchant_id
    AND d.status IN ('open', 'under_review')
  ) INTO has_active_dispute;

  -- If there's an active dispute, only allow admin modifications
  IF has_active_dispute THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      -- Get the dispute order ID for better error message
      SELECT d.order_id INTO dispute_order_id
      FROM public.orders o
      JOIN public.disputes d ON d.order_id = o.id
      WHERE o.merchant_id = NEW.merchant_id
      AND d.status IN ('open', 'under_review')
      LIMIT 1;
      
      RAISE EXCEPTION 'ESCROW_DISPUTE_LOCKED: Cannot modify escrow while dispute is active. Order: %. Admin intervention required.', dispute_order_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: We already have trigger_validate_escrow_balance which checks is_frozen
-- This adds additional dispute-specific check

-- ============================================================
-- 4. ENFORCE DISPUTE WINDOW SERVER-SIDE
-- ============================================================

-- Create function to validate dispute creation timing and state
CREATE OR REPLACE FUNCTION public.validate_dispute_creation()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
  payment_record RECORD;
  existing_active_dispute RECORD;
  dispute_window_days INTEGER;
  days_since_delivery INTEGER;
  recent_dispute_count INTEGER;
BEGIN
  -- 4a. Fetch order details
  SELECT * INTO order_record FROM public.orders WHERE id = NEW.order_id;
  
  IF order_record IS NULL THEN
    RAISE EXCEPTION 'INVALID_ORDER: Order not found: %', NEW.order_id;
  END IF;

  -- 4b. Validate order status - cannot dispute completed/refunded orders
  IF order_record.status IN ('completed', 'refunded') THEN
    RAISE EXCEPTION 'ESCROW_FINALIZED: Cannot create dispute - escrow has already been %. Order: %', order_record.status, NEW.order_id;
  END IF;

  -- 4c. Check payment status - cannot dispute released payments
  SELECT * INTO payment_record FROM public.payments WHERE order_id = NEW.order_id;
  
  IF payment_record IS NOT NULL AND payment_record.status = 'released' THEN
    RAISE EXCEPTION 'ESCROW_RELEASED: Cannot create dispute - payment has already been released. Order: %', NEW.order_id;
  END IF;

  -- 4d. Check for existing active dispute (additional safety beyond unique index)
  SELECT * INTO existing_active_dispute 
  FROM public.disputes 
  WHERE order_id = NEW.order_id 
  AND status IN ('open', 'under_review')
  AND id != NEW.id;
  
  IF existing_active_dispute IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_DISPUTE: An active dispute already exists for this order. Dispute: %', existing_active_dispute.id;
  END IF;

  -- 4e. Validate dispute window for delivered orders
  IF order_record.status = 'delivered' AND order_record.delivered_at IS NOT NULL THEN
    -- Get dispute window from settings (default 30 days)
    SELECT COALESCE(
      (SELECT setting_value::INTEGER FROM public.order_settings WHERE setting_key = 'dispute_window_days'),
      30
    ) INTO dispute_window_days;
    
    days_since_delivery := EXTRACT(DAY FROM (now() - order_record.delivered_at::timestamp));
    
    IF days_since_delivery > dispute_window_days THEN
      RAISE EXCEPTION 'DISPUTE_WINDOW_CLOSED: Dispute window has expired. Order delivered % days ago, window is % days. Order: %', 
        days_since_delivery, dispute_window_days, NEW.order_id;
    END IF;
  END IF;

  -- 4f. Rate limit - max 5 disputes per customer per 24 hours
  SELECT COUNT(*) INTO recent_dispute_count
  FROM public.disputes
  WHERE customer_id = NEW.customer_id
  AND created_at >= (now() - INTERVAL '24 hours');
  
  IF recent_dispute_count >= 5 THEN
    RAISE EXCEPTION 'DISPUTE_RATE_LIMITED: Maximum 5 disputes per 24 hours exceeded. Customer: %', NEW.customer_id;
  END IF;

  -- 4g. Validate customer owns the order
  IF order_record.customer_id != NEW.customer_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED_DISPUTE: Customer does not own this order. Order: %', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_validate_dispute_creation ON public.disputes;
CREATE TRIGGER trigger_validate_dispute_creation
  BEFORE INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.validate_dispute_creation();

-- ============================================================
-- 5. AUTO-FREEZE ESCROW ON DISPUTE CREATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_freeze_escrow_on_dispute()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
  escrow_id UUID;
BEGIN
  -- Get order to find merchant
  SELECT * INTO order_record FROM public.orders WHERE id = NEW.order_id;
  
  IF order_record IS NOT NULL THEN
    -- Find and freeze the escrow account
    UPDATE public.escrow_accounts
    SET 
      is_frozen = true,
      notes = COALESCE(notes, '') || ' | Frozen due to dispute ' || NEW.id || ' at ' || now()::text,
      updated_at = now()
    WHERE merchant_id = order_record.merchant_id
    RETURNING id INTO escrow_id;
    
    IF escrow_id IS NOT NULL THEN
      -- Log the freeze action
      INSERT INTO public.escrow_transactions (
        escrow_account_id,
        order_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reason,
        created_by
      ) SELECT 
        escrow_id,
        NEW.order_id,
        'freeze',
        0,
        locked_balance,
        locked_balance,
        'Dispute created - escrow frozen. Dispute ID: ' || NEW.id,
        NEW.customer_id
      FROM public.escrow_accounts WHERE id = escrow_id;
    END IF;
    
    -- Update order status to disputed
    UPDATE public.orders
    SET status = 'disputed', updated_at = now()
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_freeze_escrow_on_dispute ON public.disputes;
CREATE TRIGGER trigger_auto_freeze_escrow_on_dispute
  AFTER INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.auto_freeze_escrow_on_dispute();

-- ============================================================
-- 6. PREVENT ESCROW RELEASE WHILE DISPUTE IS ACTIVE
-- ============================================================

CREATE OR REPLACE FUNCTION public.block_release_during_dispute()
RETURNS TRIGGER AS $$
DECLARE
  active_dispute RECORD;
BEGIN
  -- Only check when order is being completed (escrow release)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check for active disputes
    SELECT * INTO active_dispute
    FROM public.disputes
    WHERE order_id = NEW.id
    AND status IN ('open', 'under_review')
    LIMIT 1;
    
    IF active_dispute IS NOT NULL THEN
      -- Check if this is an admin action (escrow_finalized_by would be set for admin force actions)
      IF NEW.escrow_finalized_by IS NULL OR NOT has_role(NEW.escrow_finalized_by, 'admin') THEN
        RAISE EXCEPTION 'DISPUTE_BLOCKS_RELEASE: Cannot complete order while dispute is active. Dispute: %. Close or resolve the dispute first.', active_dispute.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_block_release_during_dispute ON public.orders;
CREATE TRIGGER trigger_block_release_during_dispute
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.block_release_during_dispute();

-- ============================================================
-- 7. UNFREEZE ESCROW ON DISPUTE RESOLUTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.unfreeze_escrow_on_dispute_resolution()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
  other_active_disputes INTEGER;
  escrow_id UUID;
BEGIN
  -- Only act when dispute is being resolved/closed
  IF NEW.status IN ('resolved', 'closed') AND OLD.status IN ('open', 'under_review') THEN
    -- Get order to find merchant
    SELECT * INTO order_record FROM public.orders WHERE id = NEW.order_id;
    
    IF order_record IS NOT NULL THEN
      -- Check if there are any OTHER active disputes for this merchant's orders
      SELECT COUNT(*) INTO other_active_disputes
      FROM public.disputes d
      JOIN public.orders o ON o.id = d.order_id
      WHERE o.merchant_id = order_record.merchant_id
      AND d.id != NEW.id
      AND d.status IN ('open', 'under_review');
      
      -- Only unfreeze if no other active disputes
      IF other_active_disputes = 0 THEN
        UPDATE public.escrow_accounts
        SET 
          is_frozen = false,
          notes = COALESCE(notes, '') || ' | Unfrozen after dispute ' || NEW.id || ' resolved at ' || now()::text,
          updated_at = now()
        WHERE merchant_id = order_record.merchant_id
        RETURNING id INTO escrow_id;
        
        IF escrow_id IS NOT NULL THEN
          -- Log the unfreeze action
          INSERT INTO public.escrow_transactions (
            escrow_account_id,
            order_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            reason,
            created_by
          ) SELECT 
            escrow_id,
            NEW.order_id,
            'unfreeze',
            0,
            locked_balance,
            locked_balance,
            'Dispute resolved - escrow unfrozen. Dispute ID: ' || NEW.id || ', Decision: ' || COALESCE(NEW.final_decision, 'N/A'),
            auth.uid()
          FROM public.escrow_accounts WHERE id = escrow_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_unfreeze_escrow_on_resolution ON public.disputes;
CREATE TRIGGER trigger_unfreeze_escrow_on_resolution
  AFTER UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.unfreeze_escrow_on_dispute_resolution();

-- ============================================================
-- 8. PREVENT EVIDENCE SUBMISSION AFTER DISPUTE CLOSES
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_evidence_submission()
RETURNS TRIGGER AS $$
DECLARE
  dispute_record RECORD;
BEGIN
  -- Check if dispute is still open
  SELECT * INTO dispute_record FROM public.disputes WHERE id = NEW.dispute_id;
  
  IF dispute_record IS NULL THEN
    RAISE EXCEPTION 'INVALID_DISPUTE: Dispute not found: %', NEW.dispute_id;
  END IF;
  
  IF dispute_record.status NOT IN ('open', 'under_review') THEN
    RAISE EXCEPTION 'DISPUTE_CLOSED: Cannot submit evidence to closed/resolved dispute. Dispute: %, Status: %', 
      NEW.dispute_id, dispute_record.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply to dispute_files (customer evidence)
DROP TRIGGER IF EXISTS trigger_validate_dispute_file_submission ON public.dispute_files;
CREATE TRIGGER trigger_validate_dispute_file_submission
  BEFORE INSERT ON public.dispute_files
  FOR EACH ROW EXECUTE FUNCTION public.validate_evidence_submission();

-- Apply to merchant_evidence
DROP TRIGGER IF EXISTS trigger_validate_merchant_evidence_submission ON public.merchant_evidence;
CREATE TRIGGER trigger_validate_merchant_evidence_submission
  BEFORE INSERT ON public.merchant_evidence
  FOR EACH ROW EXECUTE FUNCTION public.validate_evidence_submission();

-- ============================================================
-- 9. LIMIT MERCHANT RESPONSE COUNT
-- ============================================================

CREATE OR REPLACE FUNCTION public.limit_dispute_responses()
RETURNS TRIGGER AS $$
DECLARE
  existing_response_count INTEGER;
  dispute_record RECORD;
BEGIN
  -- Check dispute status first
  SELECT * INTO dispute_record FROM public.disputes WHERE id = NEW.dispute_id;
  
  IF dispute_record IS NULL THEN
    RAISE EXCEPTION 'INVALID_DISPUTE: Dispute not found: %', NEW.dispute_id;
  END IF;
  
  IF dispute_record.status NOT IN ('open', 'under_review') THEN
    RAISE EXCEPTION 'DISPUTE_CLOSED: Cannot respond to closed/resolved dispute. Dispute: %, Status: %', 
      NEW.dispute_id, dispute_record.status;
  END IF;

  -- Count existing responses from this merchant
  SELECT COUNT(*) INTO existing_response_count
  FROM public.dispute_responses
  WHERE dispute_id = NEW.dispute_id
  AND merchant_id = NEW.merchant_id;
  
  -- Allow max 3 responses per dispute per merchant
  IF existing_response_count >= 3 THEN
    RAISE EXCEPTION 'RESPONSE_LIMIT: Maximum 3 responses per dispute reached. Dispute: %', NEW.dispute_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_limit_dispute_responses ON public.dispute_responses;
CREATE TRIGGER trigger_limit_dispute_responses
  BEFORE INSERT ON public.dispute_responses
  FOR EACH ROW EXECUTE FUNCTION public.limit_dispute_responses();

-- ============================================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_disputes_order_status ON public.disputes (order_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_customer_created ON public.disputes (customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_files_dispute ON public.dispute_files (dispute_id);
CREATE INDEX IF NOT EXISTS idx_merchant_evidence_dispute ON public.merchant_evidence (dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_responses_dispute ON public.dispute_responses (dispute_id, merchant_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_merchant_frozen ON public.escrow_accounts (merchant_id, is_frozen);
