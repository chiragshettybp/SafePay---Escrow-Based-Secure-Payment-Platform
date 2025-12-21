
-- Create dispute_responses table for merchant responses
CREATE TABLE IF NOT EXISTS public.dispute_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create merchant_evidence table for merchant uploads
CREATE TABLE IF NOT EXISTS public.merchant_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  description TEXT,
  evidence_type TEXT DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.dispute_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_evidence ENABLE ROW LEVEL SECURITY;

-- Enable realtime for new tables only
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_evidence;

-- RLS policies for dispute_responses
CREATE POLICY "Merchants can view responses for their disputes"
ON public.dispute_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = dispute_responses.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

CREATE POLICY "Merchants can create responses for their disputes"
ON public.dispute_responses FOR INSERT
WITH CHECK (
  auth.uid() = merchant_id
  AND EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = dispute_responses.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

CREATE POLICY "Customers can view responses on their disputes"
ON public.dispute_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = dispute_responses.dispute_id
    AND d.customer_id = auth.uid()
  )
);

-- RLS policies for merchant_evidence
CREATE POLICY "Merchants can view their own evidence"
ON public.merchant_evidence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = merchant_evidence.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

CREATE POLICY "Merchants can upload evidence for their disputes"
ON public.merchant_evidence FOR INSERT
WITH CHECK (
  auth.uid() = merchant_id
  AND EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = merchant_evidence.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

CREATE POLICY "Customers can view merchant evidence on their disputes"
ON public.merchant_evidence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = merchant_evidence.dispute_id
    AND d.customer_id = auth.uid()
  )
);

-- Add merchant-specific RLS policies for disputes table
CREATE POLICY "Merchants can view disputes for their orders"
ON public.disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = disputes.order_id
    AND o.merchant_id = auth.uid()
  )
);

CREATE POLICY "Merchants can update disputes for their orders"
ON public.disputes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = disputes.order_id
    AND o.merchant_id = auth.uid()
  )
);

-- Add merchant-specific RLS policies for dispute_updates
CREATE POLICY "Merchants can view updates for their disputes"
ON public.dispute_updates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = dispute_updates.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

CREATE POLICY "Merchants can create updates for their disputes"
ON public.dispute_updates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = dispute_updates.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

-- Add merchant-specific RLS policies for dispute_files to view customer evidence
CREATE POLICY "Merchants can view files on their disputes"
ON public.dispute_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = dispute_files.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

-- Add merchant-specific RLS policies for dispute_comments
CREATE POLICY "Merchants can view comments on their disputes"
ON public.dispute_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = dispute_comments.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

CREATE POLICY "Merchants can add comments to their disputes"
ON public.dispute_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.id = dispute_comments.dispute_id
    AND o.merchant_id = auth.uid()
  )
);

-- Storage policy for merchant dispute evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-evidence', 'merchant-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Merchants can upload evidence files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'merchant-evidence'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Merchants can view their evidence files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'merchant-evidence'
  AND auth.role() = 'authenticated'
);

-- Update trigger for updated_at
CREATE TRIGGER update_dispute_responses_updated_at
  BEFORE UPDATE ON public.dispute_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
