-- Add design_phase column to documents table
ALTER TABLE public.documents 
ADD COLUMN design_phase text;

-- Add index for better performance when filtering by design phase
CREATE INDEX idx_documents_design_phase ON public.documents(design_phase);

-- Add index for better performance when filtering by department and project
CREATE INDEX idx_documents_department_project ON public.documents(department, project_id);