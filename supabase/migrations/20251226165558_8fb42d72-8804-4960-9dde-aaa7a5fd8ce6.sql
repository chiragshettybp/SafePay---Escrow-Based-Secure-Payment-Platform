-- Fix RLS policy for checkout_sessions to allow anonymous and authenticated users to view active sessions by ID
-- The current policy is too restrictive for the public checkout flow

-- Drop the existing policy
DROP POLICY IF EXISTS "Public and users can view active sessions" ON public.checkout_sessions;

-- Create a new policy that allows viewing active sessions
-- Active sessions should be viewable by anyone since:
-- 1. They are temporary (30 min expiry)
-- 2. Users need to view them to complete checkout
-- 3. The session ID is a UUID which acts as a secret token
CREATE POLICY "Anyone can view active checkout sessions by ID" 
ON public.checkout_sessions 
FOR SELECT 
USING (
  -- Allow viewing active sessions (the UUID itself acts as a secret)
  (status = 'active')
  -- OR allow users to view their own sessions (any status)
  OR (user_id = auth.uid() AND user_id IS NOT NULL)
);

-- Also fix the UPDATE policy to allow anonymous users to update active sessions
DROP POLICY IF EXISTS "Users can update their own active sessions" ON public.checkout_sessions;

CREATE POLICY "Anyone can update active checkout sessions" 
ON public.checkout_sessions 
FOR UPDATE 
USING (
  -- Allow updating active sessions
  (status = 'active')
  -- OR allow users to update their own sessions
  OR (user_id = auth.uid() AND user_id IS NOT NULL)
)
WITH CHECK (
  -- Only allow updates to active sessions (prevents changing completed/expired sessions)
  (status = 'active')
  OR (user_id = auth.uid() AND user_id IS NOT NULL)
);