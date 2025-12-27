-- Create function to atomically increment payment link stats
-- This ensures thread-safe updates even under concurrent requests
CREATE OR REPLACE FUNCTION increment_payment_link_stats(
  link_id UUID,
  payment_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payment_links
  SET 
    total_payments = total_payments + 1,
    total_collected = total_collected + payment_amount,
    updated_at = now()
  WHERE id = link_id;
  
  -- Log if the update didn't affect any rows (link might not exist)
  IF NOT FOUND THEN
    RAISE WARNING 'Payment link % not found for stats update', link_id;
  END IF;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION increment_payment_link_stats TO service_role;
GRANT EXECUTE ON FUNCTION increment_payment_link_stats TO authenticated;