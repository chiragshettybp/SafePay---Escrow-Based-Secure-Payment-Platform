-- Create admin password resets table
CREATE TABLE public.admin_password_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  reset_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_password_resets ENABLE ROW LEVEL SECURITY;

-- Only service role can manage password resets
CREATE POLICY "Service role can manage password resets"
ON public.admin_password_resets
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create index for token lookups
CREATE INDEX idx_admin_password_resets_token ON public.admin_password_resets(reset_token);
CREATE INDEX idx_admin_password_resets_expires ON public.admin_password_resets(expires_at);