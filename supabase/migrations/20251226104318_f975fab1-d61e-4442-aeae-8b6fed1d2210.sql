-- Add Razorpay payment gateway fields to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'razorpay',
ADD COLUMN IF NOT EXISTS gateway_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS gateway_failure_reason TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Create index for faster Razorpay order lookups
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON public.payments(razorpay_order_id);

-- Create unique index to prevent duplicate Razorpay payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON public.payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- Add constraint to ensure gateway_status is valid
ALTER TABLE public.payments
ADD CONSTRAINT chk_gateway_status CHECK (gateway_status IN ('pending', 'created', 'authorized', 'captured', 'verified', 'failed', 'refunded'));

-- Comment for documentation
COMMENT ON COLUMN public.payments.razorpay_order_id IS 'Razorpay order ID returned from order creation';
COMMENT ON COLUMN public.payments.razorpay_payment_id IS 'Razorpay payment ID from successful payment';
COMMENT ON COLUMN public.payments.razorpay_signature IS 'Razorpay signature for payment verification';
COMMENT ON COLUMN public.payments.gateway_status IS 'Status from payment gateway: pending, created, authorized, captured, verified, failed, refunded';
COMMENT ON COLUMN public.payments.verified_at IS 'Timestamp when payment was verified server-side';