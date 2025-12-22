-- Create admin_users table for storing admin credentials and PIN
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view their own record
CREATE POLICY "Admins can view their own record"
ON public.admin_users
FOR SELECT
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert/update/delete (via edge functions)
CREATE POLICY "Service role can manage admin_users"
ON public.admin_users
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create admin login attempts log table
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access login attempts
CREATE POLICY "Service role can manage login attempts"
ON public.admin_login_attempts
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add trigger to update updated_at
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();