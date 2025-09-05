import { pdf } from '@react-pdf/renderer';
import { GanttPdfDocument } from './GanttPdfDocument';
import { supabase } from '@/integrations/supabase/client';
import type { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import type { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import type { Mayor } from '@/hooks/gantt-v2/useMayoresTU';

interface BuildGanttPdfOptions {
  plan: GanttPlan;
  lines: GanttLine[];
  mayores: Mayor[];
  overrides: MatrixOverride[];
  clientId: string;
  projectId: string;
}

export async function buildGanttPdf(options: BuildGanttPdfOptions): Promise<Blob> {
  const { plan, lines, mayores, overrides, clientId, projectId } = options;

  try {
    // Fetch required data
    const [companyResult, clientResult, projectResult] = await Promise.all([
      supabase.from('company_branding').select('*').limit(1).maybeSingle(),
      supabase.from('clients').select('full_name, email, phone').eq('id', clientId).single(),
      supabase.from('client_projects').select('project_name, project_location, construction_start_date').eq('id', projectId).single()
    ]);

    const companyBranding = companyResult.data || {
      company_name: 'DOVITA CONSTRUCCIONES',
      website: 'www.dovita.com',
      email: 'info@dovita.com',
      phone: '(555) 123-4567',
      address: 'Dirección de la empresa'
    };

    const client = clientResult.data;
    const project = projectResult.data;

    if (!client || !project) {
      throw new Error('No se encontraron los datos del cliente o proyecto');
    }

    // Generate PDF blob using @react-pdf/renderer properly  
    const pdfBlob = await pdf(
      GanttPdfDocument({
        plan,
        lines,
        mayores,
        overrides,
        client,
        project,
        companyBranding
      })
    ).toBlob();
    
    return pdfBlob;

  } catch (error) {
    console.error('Error building PDF:', error);
    throw new Error('Error al generar el PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}