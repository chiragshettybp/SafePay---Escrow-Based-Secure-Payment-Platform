-- =============================================================================
-- ADMIN KYC IDENTITY VERIFICATION - SECURITY FIX
-- =============================================================================

-- 1. Create KYC actions audit log table (immutable)
CREATE TABLE IF NOT EXISTS public.kyc_actions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kyc_id UUID NOT NULL,
  kyc_type TEXT NOT NULL CHECK (kyc_type IN ('customer', 'merchant')),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created', 'submitted', 'approved', 'rejected', 
    'reupload_requested', 'document_uploaded', 'document_replaced',
    'fraud_flagged', 'revoked'
  )),
  previous_status TEXT,
  new_status TEXT,
  admin_id UUID,
  reason TEXT,
  document_type TEXT,
  document_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Immutability enforcement
CREATE OR REPLACE FUNCTION public.enforce_kyc_log_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'KYC action logs are immutable and cannot be modified or deleted';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prevent_kyc_log_modification ON public.kyc_actions_log;
CREATE TRIGGER prevent_kyc_log_modification
  BEFORE UPDATE OR DELETE ON public.kyc_actions_log
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_kyc_log_immutability();

-- Indexes for KYC audit log
CREATE INDEX IF NOT EXISTS idx_kyc_log_user ON public.kyc_actions_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_log_kyc_id ON public.kyc_actions_log(kyc_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_log_admin ON public.kyc_actions_log(admin_id, created_at DESC);

-- RLS for KYC audit log
ALTER TABLE public.kyc_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all KYC logs"
  ON public.kyc_actions_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert KYC logs"
  ON public.kyc_actions_log
  FOR INSERT
  WITH CHECK (true);

-- 2. Add document_number_hash column for duplicate detection
ALTER TABLE public.kyc_records 
ADD COLUMN IF NOT EXISTS document_number_hash TEXT;

ALTER TABLE public.merchant_kyc 
ADD COLUMN IF NOT EXISTS pan_number_hash TEXT,
ADD COLUMN IF NOT EXISTS gst_number_hash TEXT;

-- 3. Create unique index on document_number_hash to prevent reuse
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_document_hash_unique
  ON public.kyc_records(document_number_hash)
  WHERE document_number_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_kyc_pan_hash_unique
  ON public.merchant_kyc(pan_number_hash)
  WHERE pan_number_hash IS NOT NULL;

-- 4. Add version tracking columns for re-upload control
ALTER TABLE public.kyc_records 
ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rejection_id UUID,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.merchant_kyc 
ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rejection_id UUID,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- 5. Create KYC document history table (immutable, append-only)
CREATE TABLE IF NOT EXISTS public.kyc_document_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kyc_id UUID NOT NULL,
  kyc_type TEXT NOT NULL CHECK (kyc_type IN ('customer', 'merchant')),
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_hash TEXT,
  file_size BIGINT,
  file_name TEXT,
  replaced_by UUID,
  submission_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Immutability for document history
CREATE OR REPLACE FUNCTION public.enforce_kyc_document_history_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'KYC document history is immutable and cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Only allow updating replaced_by field
    IF NEW.document_type != OLD.document_type 
       OR NEW.file_url != OLD.file_url 
       OR NEW.file_hash != OLD.file_hash
       OR NEW.kyc_id != OLD.kyc_id 
       OR NEW.user_id != OLD.user_id THEN
      RAISE EXCEPTION 'KYC document history core fields are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_kyc_document_history_immutable ON public.kyc_document_history;
CREATE TRIGGER enforce_kyc_document_history_immutable
  BEFORE UPDATE OR DELETE ON public.kyc_document_history
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_kyc_document_history_immutability();

CREATE INDEX IF NOT EXISTS idx_kyc_doc_history_user ON public.kyc_document_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_doc_history_kyc ON public.kyc_document_history(kyc_id, created_at DESC);

ALTER TABLE public.kyc_document_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all document history"
  ON public.kyc_document_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own document history"
  ON public.kyc_document_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert document history"
  ON public.kyc_document_history
  FOR INSERT
  WITH CHECK (true);

-- 6. Document reuse detection table
CREATE TABLE IF NOT EXISTS public.kyc_document_reuse_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempted_by UUID NOT NULL,
  document_hash TEXT NOT NULL,
  original_user_id UUID NOT NULL,
  original_kyc_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_reuse_attempts ON public.kyc_document_reuse_attempts(attempted_by, created_at DESC);

ALTER TABLE public.kyc_document_reuse_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reuse attempts"
  ON public.kyc_document_reuse_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert reuse attempts"
  ON public.kyc_document_reuse_attempts
  FOR INSERT
  WITH CHECK (true);

-- 7. Function to check document uniqueness
CREATE OR REPLACE FUNCTION public.check_kyc_document_uniqueness(
  p_document_hash TEXT,
  p_user_id UUID,
  p_document_type TEXT
)
RETURNS TABLE(is_unique BOOLEAN, original_user_id UUID, original_kyc_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_customer RECORD;
  v_existing_merchant RECORD;
BEGIN
  -- Check customer KYC records
  SELECT kr.user_id, kr.id 
  INTO v_existing_customer
  FROM public.kyc_records kr
  WHERE kr.document_number_hash = p_document_hash
    AND kr.user_id != p_user_id
  LIMIT 1;
  
  IF v_existing_customer IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_existing_customer.user_id, v_existing_customer.id;
    RETURN;
  END IF;
  
  -- Check merchant KYC records (for PAN)
  IF p_document_type = 'pan' THEN
    SELECT mk.merchant_id, mk.id 
    INTO v_existing_merchant
    FROM public.merchant_kyc mk
    WHERE mk.pan_number_hash = p_document_hash
      AND mk.merchant_id != p_user_id
    LIMIT 1;
    
    IF v_existing_merchant IS NOT NULL THEN
      RETURN QUERY SELECT FALSE, v_existing_merchant.merchant_id, v_existing_merchant.id;
      RETURN;
    END IF;
  END IF;
  
  RETURN QUERY SELECT TRUE, NULL::UUID, NULL::UUID;
END;
$$;

-- 8. Validation trigger for customer KYC document reuse
CREATE OR REPLACE FUNCTION public.validate_kyc_document_unique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Only check if document_number_hash is being set
  IF NEW.document_number_hash IS NOT NULL AND 
     (OLD IS NULL OR NEW.document_number_hash != COALESCE(OLD.document_number_hash, '')) THEN
    
    -- Check for existing usage
    SELECT user_id, id INTO v_existing
    FROM public.kyc_records
    WHERE document_number_hash = NEW.document_number_hash
      AND user_id != NEW.user_id
    LIMIT 1;
    
    IF v_existing IS NOT NULL THEN
      -- Log fraud attempt
      INSERT INTO public.kyc_document_reuse_attempts (
        attempted_by, document_hash, original_user_id, original_kyc_id, document_type
      ) VALUES (
        NEW.user_id, NEW.document_number_hash, v_existing.user_id, v_existing.id, 'id_document'
      );
      
      RAISE EXCEPTION 'This document is already registered with another account. This has been flagged for review.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_kyc_document_unique_trigger ON public.kyc_records;
CREATE TRIGGER validate_kyc_document_unique_trigger
  BEFORE INSERT OR UPDATE ON public.kyc_records
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_kyc_document_unique();

-- 9. Validation trigger for merchant PAN reuse
CREATE OR REPLACE FUNCTION public.validate_merchant_pan_unique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Check PAN uniqueness
  IF NEW.pan_number_hash IS NOT NULL AND 
     (OLD IS NULL OR NEW.pan_number_hash != COALESCE(OLD.pan_number_hash, '')) THEN
    
    SELECT merchant_id, id INTO v_existing
    FROM public.merchant_kyc
    WHERE pan_number_hash = NEW.pan_number_hash
      AND merchant_id != NEW.merchant_id
    LIMIT 1;
    
    IF v_existing IS NOT NULL THEN
      INSERT INTO public.kyc_document_reuse_attempts (
        attempted_by, document_hash, original_user_id, original_kyc_id, document_type
      ) VALUES (
        NEW.merchant_id, NEW.pan_number_hash, v_existing.merchant_id, v_existing.id, 'pan'
      );
      
      RAISE EXCEPTION 'This PAN is already registered with another merchant account. This has been flagged for review.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_merchant_pan_unique_trigger ON public.merchant_kyc;
CREATE TRIGGER validate_merchant_pan_unique_trigger
  BEFORE INSERT OR UPDATE ON public.merchant_kyc
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_merchant_pan_unique();

-- 10. State enforcement - prevent direct status changes (only via admin)
CREATE OR REPLACE FUNCTION public.enforce_kyc_status_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status is changing to approved/rejected, require reviewed_by and reviewed_at
  IF NEW.status IN ('approved', 'rejected') THEN
    IF NEW.status = 'approved' AND OLD.status != 'submitted' AND OLD.status != 'pending_review' THEN
      RAISE EXCEPTION 'Can only approve KYC from submitted or pending_review status';
    END IF;
    
    IF NEW.reviewed_by IS NULL THEN
      RAISE EXCEPTION 'Admin reviewer ID is required for approval/rejection';
    END IF;
    
    IF NEW.reviewed_at IS NULL THEN
      NEW.reviewed_at := now();
    END IF;
    
    -- Set verified_at on approval
    IF NEW.status = 'approved' THEN
      NEW.verified_at := now();
    END IF;
    
    -- Require reason for rejection
    IF NEW.status = 'rejected' AND (NEW.rejection_reason IS NULL OR NEW.rejection_reason = '') THEN
      RAISE EXCEPTION 'Rejection reason is required';
    END IF;
  END IF;
  
  -- Prevent changing from approved without admin action
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    IF NEW.status != 'revoked' THEN
      RAISE EXCEPTION 'Approved KYC can only be revoked by admin';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_kyc_status ON public.kyc_records;
CREATE TRIGGER enforce_kyc_status
  BEFORE UPDATE ON public.kyc_records
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_kyc_status_transitions();

DROP TRIGGER IF EXISTS enforce_merchant_kyc_status ON public.merchant_kyc;
CREATE TRIGGER enforce_merchant_kyc_status
  BEFORE UPDATE ON public.merchant_kyc
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_kyc_status_transitions();

-- 11. Re-upload rate limiting
CREATE OR REPLACE FUNCTION public.check_kyc_reupload_limit(
  p_user_id UUID,
  p_kyc_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Max 5 KYC submissions allowed
  IF p_kyc_type = 'customer' THEN
    SELECT submission_count INTO v_count
    FROM public.kyc_records
    WHERE user_id = p_user_id;
  ELSE
    SELECT submission_count INTO v_count
    FROM public.merchant_kyc
    WHERE merchant_id = p_user_id;
  END IF;
  
  RETURN COALESCE(v_count, 0) < 5;
END;
$$;

-- 12. Auto-log KYC status changes
CREATE OR REPLACE FUNCTION public.log_kyc_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'kyc_records' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.kyc_actions_log (
        kyc_id, kyc_type, user_id, action_type, 
        previous_status, new_status, admin_id, reason
      ) VALUES (
        NEW.id, 'customer', NEW.user_id,
        CASE 
          WHEN NEW.status = 'approved' THEN 'approved'
          WHEN NEW.status = 'rejected' THEN 'rejected'
          WHEN NEW.status = 'submitted' THEN 'submitted'
          ELSE 'created'
        END,
        OLD.status, NEW.status, NEW.reviewed_by, NEW.rejection_reason
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'merchant_kyc' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.kyc_actions_log (
        kyc_id, kyc_type, user_id, action_type, 
        previous_status, new_status, admin_id, reason
      ) VALUES (
        NEW.id, 'merchant', NEW.merchant_id,
        CASE 
          WHEN NEW.status = 'approved' OR NEW.status = 'verified' THEN 'approved'
          WHEN NEW.status = 'rejected' THEN 'rejected'
          WHEN NEW.status = 'submitted' OR NEW.status = 'under_review' THEN 'submitted'
          ELSE 'created'
        END,
        OLD.status, NEW.status, NEW.reviewed_by, NEW.rejection_reason
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_kyc_records_changes ON public.kyc_records;
CREATE TRIGGER log_kyc_records_changes
  AFTER UPDATE ON public.kyc_records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_kyc_status_change();

DROP TRIGGER IF EXISTS log_merchant_kyc_changes ON public.merchant_kyc;
CREATE TRIGGER log_merchant_kyc_changes
  AFTER UPDATE ON public.merchant_kyc
  FOR EACH ROW
  EXECUTE FUNCTION public.log_kyc_status_change();