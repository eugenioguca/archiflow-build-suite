-- Add notas_md column to planning_conceptos
ALTER TABLE public.planning_conceptos
ADD COLUMN IF NOT EXISTS notas_md TEXT;

-- Create storage bucket for concept attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'planning_v2_concept_attachments',
  'planning_v2_concept_attachments',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Create table to track concept attachments
CREATE TABLE IF NOT EXISTS public.planning_concepto_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto_id UUID NOT NULL REFERENCES public.planning_conceptos(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on attachments table
ALTER TABLE public.planning_concepto_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policy: Employees and admins can manage attachments
CREATE POLICY "Employees and admins can manage concept attachments"
ON public.planning_concepto_attachments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Storage RLS: Employees can upload to planning_v2_concept_attachments
CREATE POLICY "Employees can upload concept attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'planning_v2_concept_attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Storage RLS: Employees can read concept attachments
CREATE POLICY "Employees can read concept attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'planning_v2_concept_attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Storage RLS: Employees can delete concept attachments
CREATE POLICY "Employees can delete concept attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'planning_v2_concept_attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_planning_concepto_attachments_concepto_id 
ON public.planning_concepto_attachments(concepto_id);

-- Add comment
COMMENT ON COLUMN public.planning_conceptos.notas_md IS 'Markdown notes for the concept (long descriptions, comments, etc.)';