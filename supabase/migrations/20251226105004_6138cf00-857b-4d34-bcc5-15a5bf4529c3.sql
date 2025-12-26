-- Payment Webhook Logs table for auditing
CREATE TABLE IF NOT EXISTS public.payment_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  razorpay_event_id TEXT NOT NULL UNIQUE,
  payment_id UUID REFERENCES public.payments(id),
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all webhook logs"
ON public.payment_webhook_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert webhook logs"
ON public.payment_webhook_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update webhook logs"
ON public.payment_webhook_logs
FOR UPDATE
USING (true);

-- Indexes for webhook logs
CREATE INDEX idx_webhook_logs_event_type ON public.payment_webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_payment_id ON public.payment_webhook_logs(payment_id);
CREATE INDEX idx_webhook_logs_status ON public.payment_webhook_logs(status);
CREATE INDEX idx_webhook_logs_created_at ON public.payment_webhook_logs(created_at DESC);

-- Extend refunds table with Razorpay integration
ALTER TABLE public.refunds
ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id),
ADD COLUMN IF NOT EXISTS refund_type TEXT DEFAULT 'full' CHECK (refund_type IN ('full', 'partial')),
ADD COLUMN IF NOT EXISTS initiated_by TEXT DEFAULT 'customer' CHECK (initiated_by IN ('customer', 'admin', 'dispute', 'webhook')),
ADD COLUMN IF NOT EXISTS admin_id UUID,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Index for refund lookups
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id ON public.refunds(razorpay_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- Add is_final column to payments if not exists for double-processing prevention
-- (already added in previous migration, but adding IF NOT EXISTS for safety)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'is_final') THEN
    ALTER TABLE public.payments ADD COLUMN is_final BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Ensure realtime is enabled for payment_webhook_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_webhook_logs;