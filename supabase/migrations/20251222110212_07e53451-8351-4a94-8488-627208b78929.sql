-- Create user_verification_history table for audit trail
CREATE TABLE public.user_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'kyc_submitted', 'kyc_approved', 'kyc_rejected', 'kyc_reupload_requested', 'bank_submitted', 'bank_approved', 'bank_rejected', 'bank_reupload_requested'
  admin_id UUID,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_verification_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all user verification history"
ON public.user_verification_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert user verification history"
ON public.user_verification_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- System can also insert (for auto-generated entries)
CREATE POLICY "System can insert verification history"
ON public.user_verification_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own verification history
CREATE POLICY "Users can view their own verification history"
ON public.user_verification_history
FOR SELECT
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_user_verification_history_user_id ON public.user_verification_history(user_id);
CREATE INDEX idx_user_verification_history_created_at ON public.user_verification_history(created_at DESC);