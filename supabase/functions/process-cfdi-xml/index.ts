import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ycbflvptfgrjclzzlxci.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// FASE 2: Constantes de seguridad para validación XML
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_XML_LENGTH = 2 * 1024 * 1024; // 2MB para contenido XML
const ALLOWED_XML_ROOTS = ['cfdi:Comprobante', 'Comprobante'];

// Función para validar XML de forma segura
function validateXMLSafety(xmlContent: string): { isValid: boolean, error?: string } {
  if (xmlContent.length > MAX_XML_LENGTH) {
    return { isValid: false, error: 'XML content too large' };
  }
  
  // Verificar patrones peligrosos de XXE
  const dangerousPatterns = [
    /<!ENTITY/i,
    /<!DOCTYPE.*ENTITY/i,
    /SYSTEM\s+["'][^"']*["']/i,
    /PUBLIC\s+["'][^"']*["']/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(xmlContent)) {
      return { isValid: false, error: 'Potentially unsafe XML content detected' };
    }
  }
  
  // Verificar que sea un CFDI válido
  const hasValidRoot = ALLOWED_XML_ROOTS.some(root => xmlContent.includes(root));
  if (!hasValidRoot) {
    return { isValid: false, error: 'Invalid CFDI XML format' };
  }
  
  return { isValid: true };
}

interface CFDIData {
  uuid: string;
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    usoCFDI: string;
  };
  folio?: string;
  serie?: string;
  fecha: string;
  tipoComprobante: string;
  formaPago: string;
  metodoPago: string;
  subtotal: number;
  total: number;
  impuestos: {
    iva: number;
    isr: number;
    ieps: number;
  };
  conceptos: Array<{
    claveProdServ: string;
    cantidad: number;
    descripcion: string;
    valorUnitario: number;
    importe: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // FASE 4: Validación de origen
  const origin = req.headers.get('origin');
  const allowedOrigins = ['https://ycbflvptfgrjclzzlxci.supabase.co', 'http://localhost:8080'];
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse form data con validaciones de seguridad
    const formData = await req.formData();
    const xmlFile = formData.get('xmlFile') as File;
    const supplierIdFormData = formData.get('supplierId');
    const expenseIdFormData = formData.get('expenseId');
    
    if (!xmlFile) {
      throw new Error('No XML file provided');
    }

    // FASE 2: Validación de archivo
    if (xmlFile.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds limit (5MB)');
    }

    if (!xmlFile.type.includes('xml') && !xmlFile.name.endsWith('.xml')) {
      throw new Error('File must be XML format');
    }

    // Read XML content y validar seguridad
    const xmlContent = await xmlFile.text();
    
    // FASE 2: Validación de seguridad XML
    const xmlValidation = validateXMLSafety(xmlContent);
    if (!xmlValidation.isValid) {
      // Log security event
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseAdmin.rpc('log_security_event', {
        p_event_type: 'xml_validation_failed',
        p_event_data: { error: xmlValidation.error, file_size: xmlFile.size }
      });
      
      throw new Error('Invalid XML file: ' + xmlValidation.error);
    }
    console.log('Processing XML file:', xmlFile.name);

    // Parse XML content
    const cfdiData = parseXMLContent(xmlContent);
    console.log('Parsed CFDI data:', cfdiData);

    // Upload XML file to storage
    const fileName = `${cfdiData.uuid}_${Date.now()}.xml`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('cfdi-documents')
      .upload(fileName, xmlFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData.path);

    // Save CFDI document to database
    const { data: cfdiDocument, error: dbError } = await supabaseClient
      .from('cfdi_documents')
      .insert({
        uuid_fiscal: cfdiData.uuid,
        xml_content: xmlContent,
        file_path: uploadData.path,
        rfc_emisor: cfdiData.emisor.rfc,
        rfc_receptor: cfdiData.receptor.rfc,
        folio: cfdiData.folio,
        serie: cfdiData.serie,
        fecha_emision: cfdiData.fecha,
        tipo_comprobante: cfdiData.tipoComprobante,
        uso_cfdi: cfdiData.receptor.usoCFDI,
        forma_pago: cfdiData.formaPago,
        metodo_pago: cfdiData.metodoPago,
        subtotal: cfdiData.subtotal,
        total: cfdiData.total,
        iva: cfdiData.impuestos.iva,
        isr: cfdiData.impuestos.isr,
        ieps: cfdiData.impuestos.ieps,
        conceptos: cfdiData.conceptos,
        impuestos: cfdiData.impuestos,
        supplier_id: supplierIdFormData || null,
        expense_id: expenseIdFormData || null,
        validation_status: 'validated',
        created_by: (await supabaseClient.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Error saving to database: ${dbError.message}`);
    }

    // Update related expense if provided
    if (expenseIdFormData) {
      const { error: expenseUpdateError } = await supabaseClient
        .from('expenses')
        .update({
          cfdi_document_id: cfdiDocument.id,
          uuid_fiscal: cfdiData.uuid,
          rfc_emisor: cfdiData.emisor.rfc,
          forma_pago: cfdiData.formaPago,
          status_cfdi: 'validated',
          requires_complement: cfdiData.formaPago === 'PPD',
          amount: cfdiData.total
        })
        .eq('id', expenseIdFormData);

      if (expenseUpdateError) {
        console.error('Error updating expense:', expenseUpdateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cfdiDocument,
        message: 'CFDI processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing CFDI:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function parseXMLContent(xmlContent: string): CFDIData {
  try {
    // Basic XML parsing for CFDI 4.0
    // In a real implementation, you'd use a proper XML parser
    
    // Extract UUID from Complemento/TimbreFiscalDigital
    const uuidMatch = xmlContent.match(/UUID="([^"]+)"/);
    if (!uuidMatch) throw new Error('UUID not found in XML');
    
    // Extract basic comprobante attributes
    const comprobanteMatch = xmlContent.match(/<cfdi:Comprobante[^>]*>/);
    if (!comprobanteMatch) throw new Error('Comprobante not found');
    
    const comprobante = comprobanteMatch[0];
    
    const folio = extractAttribute(comprobante, 'Folio');
    const serie = extractAttribute(comprobante, 'Serie');
    const fecha = extractAttribute(comprobante, 'Fecha') || '';
    const tipoComprobante = extractAttribute(comprobante, 'TipoDeComprobante') || '';
    const formaPago = extractAttribute(comprobante, 'FormaPago') || '';
    const metodoPago = extractAttribute(comprobante, 'MetodoPago') || '';
    const subtotal = parseFloat(extractAttribute(comprobante, 'SubTotal') || '0');
    const total = parseFloat(extractAttribute(comprobante, 'Total') || '0');
    
    // Extract Emisor
    const emisorMatch = xmlContent.match(/<cfdi:Emisor[^>]*>/);
    const emisor = emisorMatch ? emisorMatch[0] : '';
    const emisorRfc = extractAttribute(emisor, 'Rfc') || '';
    const emisorNombre = extractAttribute(emisor, 'Nombre') || '';
    const regimenFiscal = extractAttribute(emisor, 'RegimenFiscal') || '';
    
    // Extract Receptor
    const receptorMatch = xmlContent.match(/<cfdi:Receptor[^>]*>/);
    const receptor = receptorMatch ? receptorMatch[0] : '';
    const receptorRfc = extractAttribute(receptor, 'Rfc') || '';
    const receptorNombre = extractAttribute(receptor, 'Nombre') || '';
    const usoCFDI = extractAttribute(receptor, 'UsoCFDI') || '';
    
    // Extract Impuestos (simplified)
    let iva = 0, isr = 0, ieps = 0;
    const impuestosMatch = xmlContent.match(/<cfdi:Impuestos[^>]*TotalImpuestosTrasladados="([^"]*)"[^>]*>/);
    if (impuestosMatch) {
      iva = parseFloat(impuestosMatch[1]) || 0;
    }
    
    // Extract Conceptos (simplified)
    const conceptos: any[] = [];
    const conceptoMatches = xmlContent.matchAll(/<cfdi:Concepto[^>]*>/g);
    for (const match of conceptoMatches) {
      const concepto = match[0];
      conceptos.push({
        claveProdServ: extractAttribute(concepto, 'ClaveProdServ') || '',
        cantidad: parseFloat(extractAttribute(concepto, 'Cantidad') || '1'),
        descripcion: extractAttribute(concepto, 'Descripcion') || '',
        valorUnitario: parseFloat(extractAttribute(concepto, 'ValorUnitario') || '0'),
        importe: parseFloat(extractAttribute(concepto, 'Importe') || '0')
      });
    }
    
    return {
      uuid: uuidMatch[1],
      emisor: {
        rfc: emisorRfc,
        nombre: emisorNombre,
        regimenFiscal
      },
      receptor: {
        rfc: receptorRfc,
        nombre: receptorNombre,
        usoCFDI
      },
      folio,
      serie,
      fecha,
      tipoComprobante,
      formaPago,
      metodoPago,
      subtotal,
      total,
      impuestos: { iva, isr, ieps },
      conceptos
    };
    
  } catch (error) {
    console.error('XML parsing error:', error);
    throw new Error(`Error parsing XML: ${error.message}`);
  }
}

function extractAttribute(xmlString: string, attributeName: string): string | null {
  const regex = new RegExp(`${attributeName}="([^"]*)"`, 'i');
  const match = xmlString.match(regex);
  return match ? match[1] : null;
}