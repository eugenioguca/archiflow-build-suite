-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);

-- Create invoice template configuration table
CREATE TABLE public.invoice_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name text NOT NULL DEFAULT 'Plantilla por defecto',
  is_active boolean DEFAULT true,
  company_logo_url text,
  company_logo_path text,
  header_config jsonb DEFAULT '{
    "show_logo": true,
    "logo_position": "left",
    "logo_size": "medium",
    "show_company_info": true,
    "company_info_position": "right"
  }'::jsonb,
  colors_config jsonb DEFAULT '{
    "primary_color": "#3B82F6",
    "secondary_color": "#64748B",
    "accent_color": "#EF4444",
    "text_color": "#1F2937",
    "background_color": "#FFFFFF"
  }'::jsonb,
  fonts_config jsonb DEFAULT '{
    "title_font": "Arial",
    "title_size": "24",
    "subtitle_font": "Arial",
    "subtitle_size": "18",
    "body_font": "Arial",
    "body_size": "12"
  }'::jsonb,
  layout_config jsonb DEFAULT '{
    "page_size": "A4",
    "margin_top": "20",
    "margin_bottom": "20",
    "margin_left": "20",
    "margin_right": "20",
    "show_watermark": false,
    "watermark_text": "PAGADO"
  }'::jsonb,
  footer_config jsonb DEFAULT '{
    "show_footer": true,
    "footer_text": "Gracias por su preferencia",
    "show_page_numbers": true,
    "show_generation_date": true
  }'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for invoice templates
CREATE POLICY "Only admins can manage invoice templates" 
ON public.invoice_templates 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

-- Create storage policies for company logos
CREATE POLICY "Employees and admins can view company logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-logos' AND EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Only admins can upload company logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-logos' AND EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

CREATE POLICY "Only admins can update company logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-logos' AND EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

CREATE POLICY "Only admins can delete company logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'company-logos' AND EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_invoice_templates_updated_at
BEFORE UPDATE ON public.invoice_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.invoice_templates (
  template_name,
  created_by
) SELECT 
  'Plantilla Corporativa Estándar',
  p.user_id
FROM profiles p 
WHERE p.role = 'admin' 
LIMIT 1;