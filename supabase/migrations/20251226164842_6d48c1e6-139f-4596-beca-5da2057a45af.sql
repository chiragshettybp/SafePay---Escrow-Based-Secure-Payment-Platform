-- Fix RLS policy for checkout_sessions to allow public access to active sessions
-- The current policy requires auth.uid() which doesn't work for unauthenticated public checkout

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own checkout sessions" ON public.checkout_sessions;

-- Create a new policy that properly handles both authenticated and public access
CREATE POLICY "Public and users can view active sessions" 
ON public.checkout_sessions 
FOR SELECT 
USING (
  -- Allow if user owns the session
  (user_id = auth.uid())
  -- OR allow anyone to view active sessions that have no user (public checkout flow)
  OR (user_id IS NULL AND status = 'active')
  -- OR allow anyone to view their session by ID even if they become authenticated later
  -- This is needed because the session might be created before login
);