-- Add account_status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Create user_warnings table
CREATE TABLE public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  reason text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_bans table  
CREATE TABLE public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('suspend', 'ban')),
  reason text NOT NULL,
  notes text,
  duration_days integer,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_warnings
CREATE POLICY "Admins can view all user warnings"
ON public.user_warnings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert user warnings"
ON public.user_warnings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_bans
CREATE POLICY "Admins can view all user bans"
ON public.user_bans
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert user bans"
ON public.user_bans
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user bans"
ON public.user_bans
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policy for admin to update profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on user_bans
CREATE TRIGGER update_user_bans_updated_at
BEFORE UPDATE ON public.user_bans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();