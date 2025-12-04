-- Add additional columns to disputes table
ALTER TABLE public.disputes 
ADD COLUMN IF NOT EXISTS issue_type text,
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_decision text,
ADD COLUMN IF NOT EXISTS merchant_responded boolean DEFAULT false;

-- Create dispute_updates table for timeline
CREATE TABLE IF NOT EXISTS public.dispute_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text,
  created_by text DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create dispute_comments table for messages
CREATE TABLE IF NOT EXISTS public.dispute_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create dispute_files table for uploaded evidence
CREATE TABLE IF NOT EXISTS public.dispute_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  file_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispute_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_files ENABLE ROW LEVEL SECURITY;

-- RLS for dispute_updates
CREATE POLICY "Customers can view updates for their disputes"
ON public.dispute_updates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM disputes WHERE disputes.id = dispute_updates.dispute_id AND disputes.customer_id = auth.uid()
));

-- RLS for dispute_comments
CREATE POLICY "Customers can view comments for their disputes"
ON public.dispute_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM disputes WHERE disputes.id = dispute_comments.dispute_id AND disputes.customer_id = auth.uid()
));

CREATE POLICY "Customers can add comments to their disputes"
ON public.dispute_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM disputes WHERE disputes.id = dispute_comments.dispute_id AND disputes.customer_id = auth.uid())
);

-- RLS for dispute_files
CREATE POLICY "Customers can view files for their disputes"
ON public.dispute_files FOR SELECT
USING (EXISTS (
  SELECT 1 FROM disputes WHERE disputes.id = dispute_files.dispute_id AND disputes.customer_id = auth.uid()
));

CREATE POLICY "Customers can upload files to their disputes"
ON public.dispute_files FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM disputes WHERE disputes.id = dispute_files.dispute_id AND disputes.customer_id = auth.uid()
));

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE dispute_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE dispute_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE dispute_files;
ALTER PUBLICATION supabase_realtime ADD TABLE disputes;