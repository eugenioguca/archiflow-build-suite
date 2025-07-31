-- Crear tabla para almacenar archivos XML de facturas CFDI
CREATE TABLE IF NOT EXISTS public.cfdi_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uuid_fiscal TEXT NOT NULL UNIQUE, -- UUID del CFDI
  xml_content TEXT NOT NULL, -- Contenido del XML
  file_path TEXT NOT NULL, -- Ruta del archivo en storage
  rfc_emisor TEXT NOT NULL,
  rfc_receptor TEXT NOT NULL,
  folio TEXT,
  serie TEXT,
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo_comprobante TEXT NOT NULL, -- I=Ingreso, E=Egreso, T=Traslado, P=Pago
  uso_cfdi TEXT, -- Clave de uso CFDI (G01, G03, etc.)
  forma_pago TEXT, -- PUE, PPD
  metodo_pago TEXT, -- 01=Efectivo, 02=Cheque, etc.
  subtotal NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  iva NUMERIC(15,2) DEFAULT 0,
  isr NUMERIC(15,2) DEFAULT 0,
  ieps NUMERIC(15,2) DEFAULT 0,
  conceptos JSONB DEFAULT '[]'::jsonb, -- Array de conceptos
  impuestos JSONB DEFAULT '{}'::jsonb, -- Detalle de impuestos
  supplier_id UUID REFERENCES public.suppliers(id),
  client_id UUID REFERENCES public.clients(id),
  expense_id UUID REFERENCES public.expenses(id),
  income_id UUID REFERENCES public.incomes(id),
  status TEXT DEFAULT 'active', -- active, cancelled, replaced
  validation_status TEXT DEFAULT 'pending', -- pending, validated, invalid
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Crear tabla para complementos de pago (para facturas PPD)
CREATE TABLE IF NOT EXISTS public.payment_complements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cfdi_document_id UUID NOT NULL REFERENCES public.cfdi_documents(id),
  complement_uuid TEXT NOT NULL, -- UUID del complemento de pago
  fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL,
  monto_pago NUMERIC(15,2) NOT NULL,
  moneda TEXT DEFAULT 'MXN',
  forma_pago TEXT NOT NULL, -- 01=Efectivo, 02=Cheque, etc.
  xml_content TEXT NOT NULL,
  file_path TEXT NOT NULL,
  received_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, received, validated
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Actualizar tabla de expenses para integración CFDI
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS cfdi_document_id UUID REFERENCES public.cfdi_documents(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS uuid_fiscal TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS rfc_emisor TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS forma_pago TEXT; -- PUE, PPD
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status_cfdi TEXT DEFAULT 'pending'; -- pending, validated, cancelled
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS requires_complement BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS complement_received BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method TEXT; -- efectivo, transferencia, cheque
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Actualizar tabla de incomes para integración CFDI
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS cfdi_document_id UUID REFERENCES public.cfdi_documents(id);
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS uuid_fiscal TEXT;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS rfc_receptor TEXT;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS forma_pago TEXT; -- PUE, PPD
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS status_cfdi TEXT DEFAULT 'pending';
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS requires_complement BOOLEAN DEFAULT false;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS complement_sent BOOLEAN DEFAULT false;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS uso_cfdi TEXT;

-- Actualizar tabla de suppliers con campos fiscales mexicanos
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS rfc TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS regimen_fiscal TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS uso_cfdi_default TEXT DEFAULT 'G03';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS dias_credito INTEGER DEFAULT 30;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS limite_credito NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS saldo_actual NUMERIC(15,2) DEFAULT 0;

-- Crear tabla para seguimiento de pagos a proveedores
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  accounts_payable_id UUID REFERENCES public.accounts_payable(id),
  expense_id UUID REFERENCES public.expenses(id),
  amount NUMERIC(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL, -- transferencia, cheque, efectivo
  reference_number TEXT,
  bank_account TEXT,
  notes TEXT,
  cfdi_complement_id UUID REFERENCES public.payment_complements(id),
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Crear tabla para configuración fiscal de la empresa
CREATE TABLE IF NOT EXISTS public.company_fiscal_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfc TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  regimen_fiscal TEXT NOT NULL,
  domicilio_fiscal JSONB NOT NULL,
  certificado_cer TEXT,
  llave_privada_key TEXT,
  password_sat TEXT,
  pac_provider TEXT, -- Proveedor de certificación autorizado
  pac_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para reportes fiscales
CREATE TABLE IF NOT EXISTS public.fiscal_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL, -- mensual, anual, declaracion
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  file_path TEXT,
  status TEXT DEFAULT 'draft', -- draft, submitted, accepted
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_cfdi_documents_uuid ON public.cfdi_documents(uuid_fiscal);
CREATE INDEX IF NOT EXISTS idx_cfdi_documents_supplier ON public.cfdi_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_cfdi_documents_fecha ON public.cfdi_documents(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_payment_complements_cfdi ON public.payment_complements(cfdi_document_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON public.supplier_payments(payment_date);

-- RLS Policies para cfdi_documents
ALTER TABLE public.cfdi_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees and admins can manage CFDI documents" 
ON public.cfdi_documents FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies para payment_complements
ALTER TABLE public.payment_complements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees and admins can manage payment complements" 
ON public.payment_complements FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies para supplier_payments
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees and admins can manage supplier payments" 
ON public.supplier_payments FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies para company_fiscal_config
ALTER TABLE public.company_fiscal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage fiscal config" 
ON public.company_fiscal_config FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = 'admin'
));

-- RLS Policies para fiscal_reports
ALTER TABLE public.fiscal_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees and admins can manage fiscal reports" 
ON public.fiscal_reports FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Crear triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cfdi_documents_updated_at 
BEFORE UPDATE ON public.cfdi_documents 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_complements_updated_at 
BEFORE UPDATE ON public.payment_complements 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_payments_updated_at 
BEFORE UPDATE ON public.supplier_payments 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_fiscal_config_updated_at 
BEFORE UPDATE ON public.company_fiscal_config 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fiscal_reports_updated_at 
BEFORE UPDATE ON public.fiscal_reports 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Crear bucket para archivos XML y documentos fiscales
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cfdi-documents', 'cfdi-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para documentos CFDI
CREATE POLICY "Employees can upload CFDI documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'cfdi-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees can view CFDI documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'cfdi-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees can update CFDI documents" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'cfdi-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees can delete CFDI documents" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'cfdi-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);