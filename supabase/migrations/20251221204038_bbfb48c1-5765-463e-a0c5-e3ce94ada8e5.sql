-- =====================================================
-- MERCHANT PROFILE & KYC SYSTEM
-- =====================================================

-- 1. Add logo_url column to merchants table if not exists
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Merchant KYC Table
CREATE TABLE IF NOT EXISTS public.merchant_kyc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL UNIQUE,
  -- Business details
  legal_business_name TEXT,
  business_type TEXT, -- sole_proprietor, partnership, private_ltd, llp, others
  gst_number TEXT,
  pan_number TEXT,
  registered_address TEXT,
  -- Owner details
  owner_name TEXT,
  owner_dob DATE,
  owner_phone TEXT,
  additional_notes TEXT,
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, submitted, under_review, verified, rejected
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_kyc ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own KYC"
  ON public.merchant_kyc FOR SELECT
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can insert their own KYC"
  ON public.merchant_kyc FOR INSERT
  WITH CHECK (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update their own KYC"
  ON public.merchant_kyc FOR UPDATE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

-- 3. Merchant KYC Documents Table
CREATE TABLE IF NOT EXISTS public.merchant_kyc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  kyc_id UUID REFERENCES public.merchant_kyc(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- business_registration, gst_certificate, pan_card, owner_id_front, owner_id_back, address_proof, other
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_kyc_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own KYC documents"
  ON public.merchant_kyc_documents FOR SELECT
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can insert their own KYC documents"
  ON public.merchant_kyc_documents FOR INSERT
  WITH CHECK (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update their own KYC documents"
  ON public.merchant_kyc_documents FOR UPDATE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can delete their own KYC documents"
  ON public.merchant_kyc_documents FOR DELETE
  USING (auth.uid() = merchant_id AND has_role(auth.uid(), 'merchant'::app_role));

-- 4. Create storage bucket for merchant KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-kyc', 'merchant-kyc', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Create storage bucket for merchant logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-logos', 'merchant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for merchant-kyc bucket
CREATE POLICY "Merchants can upload their own KYC documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'merchant-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Merchants can view their own KYC documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'merchant-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Merchants can delete their own KYC documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'merchant-kyc' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Storage policies for merchant-logos bucket
CREATE POLICY "Merchants can upload their own logo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'merchant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view merchant logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'merchant-logos');

CREATE POLICY "Merchants can update their own logo"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'merchant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Merchants can delete their own logo"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'merchant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_merchant_kyc_merchant_id ON public.merchant_kyc(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_kyc_status ON public.merchant_kyc(status);
CREATE INDEX IF NOT EXISTS idx_merchant_kyc_documents_merchant_id ON public.merchant_kyc_documents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_kyc_documents_kyc_id ON public.merchant_kyc_documents(kyc_id);

-- 9. Update timestamp triggers
CREATE TRIGGER update_merchant_kyc_updated_at
  BEFORE UPDATE ON public.merchant_kyc
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchant_kyc_documents_updated_at
  BEFORE UPDATE ON public.merchant_kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Enable realtime for KYC tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_kyc;