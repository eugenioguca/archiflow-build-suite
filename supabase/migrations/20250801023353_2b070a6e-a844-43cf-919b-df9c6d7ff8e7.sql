-- Create SAT catalogs for products and services
CREATE TABLE public.sat_product_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clave_producto TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  incluye_iva BOOLEAN DEFAULT false,
  complemento_concepto TEXT,
  fecha_inicio_vigencia DATE,
  fecha_fin_vigencia DATE,
  estimulo_frontera TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.sat_unit_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clave_unidad TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  nota TEXT,
  fecha_inicio_vigencia DATE,
  fecha_fin_vigencia DATE,
  simbolo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products and services catalog
CREATE TABLE public.products_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_interno TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  clave_sat TEXT NOT NULL,
  unidad_sat TEXT NOT NULL,
  precio_unitario NUMERIC(15,4) NOT NULL DEFAULT 0,
  precio_minimo NUMERIC(15,4),
  precio_maximo NUMERIC(15,4),
  tipo TEXT NOT NULL CHECK (tipo IN ('producto', 'servicio')) DEFAULT 'producto',
  aplica_iva BOOLEAN DEFAULT true,
  tasa_iva NUMERIC(5,4) DEFAULT 0.16,
  aplica_ieps BOOLEAN DEFAULT false,
  tasa_ieps NUMERIC(5,4) DEFAULT 0,
  objeto_impuesto TEXT DEFAULT '02', -- 01=No objeto, 02=Sí objeto, 03=Sí objeto y no obligado
  stock_actual NUMERIC(15,4) DEFAULT 0,
  stock_minimo NUMERIC(15,4) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  imagen_url TEXT,
  categoria TEXT,
  subcategoria TEXT,
  marca TEXT,
  modelo TEXT,
  codigo_barras TEXT,
  cuenta_contable TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice series control
CREATE TABLE public.invoice_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serie TEXT NOT NULL,
  descripcion TEXT,
  tipo_comprobante TEXT NOT NULL CHECK (tipo_comprobante IN ('I', 'E', 'T', 'N', 'P')),
  folio_inicial INTEGER NOT NULL DEFAULT 1,
  folio_actual INTEGER NOT NULL DEFAULT 1,
  folio_final INTEGER,
  activa BOOLEAN DEFAULT true,
  automatica BOOLEAN DEFAULT true,
  prefijo TEXT,
  sufijo TEXT,
  longitud_folio INTEGER DEFAULT 6,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(serie, tipo_comprobante)
);

-- Create electronic invoices table
CREATE TABLE public.electronic_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serie TEXT NOT NULL,
  folio TEXT NOT NULL,
  uuid_fiscal TEXT UNIQUE,
  version_cfdi TEXT DEFAULT '4.0',
  tipo_comprobante TEXT NOT NULL CHECK (tipo_comprobante IN ('I', 'E', 'T', 'N', 'P')),
  
  -- Emisor data
  emisor_rfc TEXT NOT NULL,
  emisor_razon_social TEXT NOT NULL,
  emisor_regimen_fiscal TEXT NOT NULL,
  
  -- Receptor data
  receptor_rfc TEXT NOT NULL,
  receptor_razon_social TEXT NOT NULL,
  receptor_uso_cfdi TEXT NOT NULL,
  receptor_regimen_fiscal TEXT,
  receptor_domicilio_fiscal TEXT,
  
  -- Invoice data
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_vencimiento DATE,
  fecha_timbrado TIMESTAMP WITH TIME ZONE,
  lugar_expedicion TEXT NOT NULL,
  metodo_pago TEXT DEFAULT 'PUE', -- PUE=Pago en una sola exhibición, PPD=Pago en parcialidades
  forma_pago TEXT DEFAULT '99', -- Catálogo SAT
  condiciones_pago TEXT,
  moneda TEXT DEFAULT 'MXN',
  tipo_cambio NUMERIC(10,6) DEFAULT 1.000000,
  
  -- Amounts
  subtotal NUMERIC(15,4) NOT NULL DEFAULT 0,
  descuento NUMERIC(15,4) DEFAULT 0,
  total NUMERIC(15,4) NOT NULL DEFAULT 0,
  
  -- Taxes
  total_impuestos_trasladados NUMERIC(15,4) DEFAULT 0,
  total_impuestos_retenidos NUMERIC(15,4) DEFAULT 0,
  
  -- Concepts (detailed items)
  conceptos JSONB NOT NULL DEFAULT '[]',
  
  -- Tax details
  impuestos JSONB DEFAULT '{}',
  
  -- CFDi specific
  sello_cfdi TEXT,
  sello_sat TEXT,
  certificado_sat TEXT,
  fecha_certificacion TIMESTAMP WITH TIME ZONE,
  rfc_proveedor_certif TEXT,
  numero_certificado_sat TEXT,
  cadena_original_complemento TEXT,
  
  -- Status and control
  estatus TEXT DEFAULT 'borrador' CHECK (estatus IN ('borrador', 'timbrada', 'cancelada', 'error')),
  motivo_cancelacion TEXT,
  fecha_cancelacion TIMESTAMP WITH TIME ZONE,
  uuid_sustitucion TEXT,
  
  -- Files
  xml_path TEXT,
  pdf_path TEXT,
  xml_content TEXT,
  
  -- Relations
  client_id UUID,
  project_id UUID,
  income_id UUID,
  
  -- PAC data
  pac_response JSONB,
  pac_error_message TEXT,
  
  -- Observaciones
  observaciones TEXT,
  referencia_interna TEXT,
  orden_compra TEXT,
  
  -- Control
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(serie, folio)
);

-- Create invoice cancellations table
CREATE TABLE public.invoice_cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.electronic_invoices(id),
  motivo_cancelacion TEXT NOT NULL CHECK (motivo_cancelacion IN ('01', '02', '03', '04')),
  uuid_sustitucion TEXT,
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_cancelacion TIMESTAMP WITH TIME ZONE,
  estatus TEXT DEFAULT 'solicitada' CHECK (estatus IN ('solicitada', 'aceptada', 'rechazada', 'plazo_vencido')),
  acuse_cancelacion TEXT,
  observaciones TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PAC configurations table
CREATE TABLE public.pac_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  proveedor TEXT NOT NULL CHECK (proveedor IN ('facturama', 'sw_sapien', 'fiscal_api', 'otro')),
  activo BOOLEAN DEFAULT false,
  principal BOOLEAN DEFAULT false,
  
  -- API Configuration
  api_url TEXT NOT NULL,
  usuario TEXT,
  password TEXT,
  api_key TEXT,
  api_secret TEXT,
  
  -- Endpoints
  endpoint_timbrado TEXT,
  endpoint_cancelacion TEXT,
  endpoint_consulta TEXT,
  
  -- Limits and costs
  creditos_disponibles INTEGER DEFAULT 0,
  costo_timbrado NUMERIC(10,4) DEFAULT 0,
  limite_mensual INTEGER,
  
  -- Testing
  modo_pruebas BOOLEAN DEFAULT true,
  
  -- Configuration
  configuracion_adicional JSONB DEFAULT '{}',
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment complements tracking (enhanced)
CREATE TABLE public.payment_complements_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.electronic_invoices(id),
  payment_id UUID REFERENCES public.client_payments(id),
  complement_uuid TEXT,
  monto_pago NUMERIC(15,4) NOT NULL,
  fecha_pago DATE NOT NULL,
  forma_pago TEXT NOT NULL,
  moneda TEXT DEFAULT 'MXN',
  tipo_cambio NUMERIC(10,6) DEFAULT 1.000000,
  numero_operacion TEXT,
  rfc_banco_origen TEXT,
  cuenta_origen TEXT,
  rfc_banco_destino TEXT,
  cuenta_destino TEXT,
  tipo_cadena_pago TEXT,
  certificado_pago TEXT,
  cadena_pago TEXT,
  sello_pago TEXT,
  estatus TEXT DEFAULT 'pendiente' CHECK (estatus IN ('pendiente', 'generado', 'timbrado', 'error')),
  xml_path TEXT,
  pdf_path TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CONTPAQi export configurations
CREATE TABLE public.contpaq_export_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_configuracion TEXT NOT NULL,
  empresa_bd TEXT NOT NULL,
  ejercicio INTEGER NOT NULL,
  periodo INTEGER,
  
  -- Account mapping
  cuenta_ventas_default TEXT DEFAULT '4010001',
  cuenta_iva_trasladado TEXT DEFAULT '2160001',
  cuenta_iva_retenido TEXT DEFAULT '1180001',
  cuenta_isr_retenido TEXT DEFAULT '1180002',
  cuenta_clientes_default TEXT DEFAULT '1050001',
  
  -- Format settings
  formato_exportacion TEXT DEFAULT 'csv' CHECK (formato_exportacion IN ('csv', 'excel', 'xml', 'txt')),
  incluir_encabezados BOOLEAN DEFAULT true,
  separador_csv TEXT DEFAULT ',',
  codificacion TEXT DEFAULT 'UTF-8',
  
  -- CONTPAQi specific
  tipo_poliza TEXT DEFAULT 'D', -- D=Diario, I=Ingresos, E=Egresos
  concepto_poliza_template TEXT DEFAULT 'Facturación del {fecha_inicio} al {fecha_fin}',
  agrupar_por TEXT DEFAULT 'dia' CHECK (agrupar_por IN ('dia', 'semana', 'mes')),
  
  -- Mapping rules
  mapeo_cuentas JSONB DEFAULT '{}',
  mapeo_auxiliares JSONB DEFAULT '{}',
  
  activa BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sat_product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_unit_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electronic_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_complements_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contpaq_export_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees and admins
CREATE POLICY "Employees and admins can manage SAT catalogs" 
ON public.sat_product_catalog FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Employees and admins can manage SAT units" 
ON public.sat_unit_catalog FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Employees and admins can manage products/services" 
ON public.products_services FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Employees and admins can manage invoice series" 
ON public.invoice_series FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Employees and admins can manage electronic invoices" 
ON public.electronic_invoices FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Employees and admins can manage invoice cancellations" 
ON public.invoice_cancellations FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Only admins can manage PAC configurations" 
ON public.pac_configurations FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

CREATE POLICY "Employees and admins can manage payment complements tracking" 
ON public.payment_complements_tracking FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Employees and admins can manage CONTPAQi export config" 
ON public.contpaq_export_config FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

-- Create indexes for better performance
CREATE INDEX idx_products_services_codigo_interno ON public.products_services(codigo_interno);
CREATE INDEX idx_products_services_clave_sat ON public.products_services(clave_sat);
CREATE INDEX idx_products_services_activo ON public.products_services(activo);

CREATE INDEX idx_electronic_invoices_uuid_fiscal ON public.electronic_invoices(uuid_fiscal);
CREATE INDEX idx_electronic_invoices_serie_folio ON public.electronic_invoices(serie, folio);
CREATE INDEX idx_electronic_invoices_estatus ON public.electronic_invoices(estatus);
CREATE INDEX idx_electronic_invoices_fecha_emision ON public.electronic_invoices(fecha_emision);
CREATE INDEX idx_electronic_invoices_client_id ON public.electronic_invoices(client_id);

CREATE INDEX idx_invoice_cancellations_invoice_id ON public.invoice_cancellations(invoice_id);
CREATE INDEX idx_payment_complements_tracking_invoice_id ON public.payment_complements_tracking(invoice_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_services_updated_at
  BEFORE UPDATE ON public.products_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_series_updated_at
  BEFORE UPDATE ON public.invoice_series
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_electronic_invoices_updated_at
  BEFORE UPDATE ON public.electronic_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pac_configurations_updated_at
  BEFORE UPDATE ON public.pac_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_complements_tracking_updated_at
  BEFORE UPDATE ON public.payment_complements_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contpaq_export_config_updated_at
  BEFORE UPDATE ON public.contpaq_export_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();