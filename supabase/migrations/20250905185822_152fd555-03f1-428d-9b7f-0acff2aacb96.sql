-- Create company_branding table for PDF headers and company information
CREATE TABLE public.company_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'DOVITA CONSTRUCCIONES',
  logo_url TEXT,
  website TEXT DEFAULT 'www.dovita.com',
  email TEXT DEFAULT 'info@dovita.com',  
  phone TEXT DEFAULT '(555) 123-4567',
  address TEXT DEFAULT 'Dirección de la empresa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

-- Create policies for company branding access
CREATE POLICY "Employees and admins can manage company branding" 
ON public.company_branding 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin'::user_role, 'employee'::user_role)
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company branding record
INSERT INTO public.company_branding (
  company_name,
  website, 
  email,
  phone,
  address,
  created_by
) VALUES (
  'DOVITA CONSTRUCCIONES',
  'www.dovita.com',
  'info@dovita.com', 
  '(555) 123-4567',
  'Dirección de la empresa',
  '00000000-0000-0000-0000-000000000000'
);