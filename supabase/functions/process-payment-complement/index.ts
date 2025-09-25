import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ycbflvptfgrjclzzlxci.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// FASE 2: Constantes de seguridad
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_XML_LENGTH = 2 * 1024 * 1024; // 2MB

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const formData = await req.formData();
    const xmlFile = formData.get('xmlFile') as File;
    const cfdiDocumentId = formData.get('cfdiDocumentId') as string;

    if (!xmlFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'No XML file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read XML content
    const xmlContent = await xmlFile.text();
    console.log('Processing payment complement XML...');

    // Parse XML to extract complement data using text parsing
    // Since DOMParser is not available in Deno, we'll use regex parsing
    console.log('Parsing XML content...');

    // Basic validation - check if it's valid XML
    if (!xmlContent.includes('<?xml') || !xmlContent.includes('cfdi:Comprobante')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid XML format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract complement UUID from TimbreFiscalDigital
    const uuidMatch = xmlContent.match(/UUID="([^"]+)"/i);
    const complementUuid = uuidMatch ? uuidMatch[1] : null;

    if (!complementUuid) {
      return new Response(
        JSON.stringify({ success: false, error: 'UUID not found in complement' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract payment data using regex
    const montoMatch = xmlContent.match(/Monto="([^"]+)"/i);
    const fechaMatch = xmlContent.match(/FechaPago="([^"]+)"/i);
    const formaPagoMatch = xmlContent.match(/FormaDePagoP="([^"]+)"/i);
    const doctoMatch = xmlContent.match(/IdDocumento="([^"]+)"/i);

    const montoPago = montoMatch ? parseFloat(montoMatch[1]) : 0;
    const fechaPago = fechaMatch ? fechaMatch[1] : null;
    const formaPago = formaPagoMatch ? formaPagoMatch[1] : null;
    const cfdiUuidOriginal = doctoMatch ? doctoMatch[1] : null;

    let originalCfdiId = cfdiDocumentId;

    // If no cfdiDocumentId provided, try to find it by UUID
    if (!originalCfdiId && cfdiUuidOriginal) {
      const { data: cfdiDoc, error: cfdiError } = await supabaseClient
        .from('cfdi_documents')
        .select('id')
        .eq('uuid_fiscal', cfdiUuidOriginal)
        .single();

      if (cfdiError) {
        console.error('Error finding original CFDI:', cfdiError);
        return new Response(
          JSON.stringify({ success: false, error: 'Original CFDI not found in system' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      originalCfdiId = cfdiDoc.id;
    }

    // Upload complement file to storage
    const fileName = `complements/${originalCfdiId}/${complementUuid}.xml`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('cfdi-documents')
      .upload(fileName, xmlFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading complement file:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload complement file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert payment complement record
    const { data: complement, error: insertError } = await supabaseClient
      .from('payment_complements')
      .insert({
        complement_uuid: complementUuid,
        cfdi_document_id: originalCfdiId,
        xml_content: xmlContent,
        file_path: fileName,
        monto_pago: montoPago,
        fecha_pago: fechaPago,
        forma_pago: formaPago,
        status: 'received',
        received_date: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting complement:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save complement data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update related income/expense records
    const { error: updateIncomeError } = await supabaseClient
      .from('incomes')
      .update({ 
        complement_sent: true,
        payment_status: 'paid'
      })
      .eq('cfdi_document_id', originalCfdiId);

    if (updateIncomeError) {
      console.log('No income record to update, checking expenses...');
    }

    const { error: updateExpenseError } = await supabaseClient
      .from('expenses')
      .update({ 
        complement_received: true
      })
      .eq('cfdi_document_id', originalCfdiId);

    if (updateExpenseError) {
      console.log('No expense record to update');
    }

    // Get the original CFDI data for response
    const { data: originalCfdi } = await supabaseClient
      .from('cfdi_documents')
      .select('uuid_fiscal, total, rfc_emisor, rfc_receptor')
      .eq('id', originalCfdiId)
      .single();

    const responseData = {
      success: true,
      complement: {
        ...complement,
        original_cfdi: originalCfdi
      }
    };

    console.log('Payment complement processed successfully:', complementUuid);

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing payment complement:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});