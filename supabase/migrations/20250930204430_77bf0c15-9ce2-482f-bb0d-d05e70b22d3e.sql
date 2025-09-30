-- Create table for concepto attachments
CREATE TABLE IF NOT EXISTS public.planning_concepto_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto_id UUID NOT NULL REFERENCES public.planning_conceptos(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.planning_concepto_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins y usuarios con permiso planning_v2_editor pueden gestionar adjuntos
CREATE POLICY "Planning v2 editors can manage attachments"
ON public.planning_concepto_attachments
FOR ALL
USING (
  public.has_planning_v2_role(auth.uid(), 'editor')
  OR public.has_planning_v2_role(auth.uid(), 'viewer')
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_planning_concepto_attachments_concepto_id 
ON public.planning_concepto_attachments(concepto_id);

-- Create table for audit log
CREATE TABLE IF NOT EXISTS public.planning_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'concepto', 'partida', 'budget'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  field_name TEXT, -- campo modificado
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.planning_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Todos los usuarios de planning v2 pueden ver el historial
CREATE POLICY "Planning v2 users can view audit log"
ON public.planning_audit_log
FOR SELECT
USING (
  public.has_planning_v2_role(auth.uid(), 'viewer')
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_planning_audit_log_entity 
ON public.planning_audit_log(entity_type, entity_id);

-- Create storage bucket for planning attachments (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('planning_attachments', 'planning_attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: usuarios con permiso planning_v2_editor pueden subir
CREATE POLICY "Planning v2 editors can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'planning_attachments'
  AND (public.has_planning_v2_role(auth.uid(), 'editor'))
);

CREATE POLICY "Planning v2 users can view attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'planning_attachments'
  AND (
    public.has_planning_v2_role(auth.uid(), 'viewer')
    OR public.has_planning_v2_role(auth.uid(), 'editor')
  )
);

CREATE POLICY "Planning v2 editors can delete attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'planning_attachments'
  AND public.has_planning_v2_role(auth.uid(), 'editor')
);