import { pdf } from '@react-pdf/renderer';
import { GanttPdfDocument } from './GanttPdfDocument';
import { supabase } from '@/integrations/supabase/client';
import type { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import type { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import type { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import type { ReferenceLine } from '@/hooks/gantt-v2/useReferenceLines';

interface BuildGanttPdfOptions {
  plan: GanttPlan;
  lines: GanttLine[];
  mayores: Mayor[];
  overrides: MatrixOverride[];
  referenceLines?: ReferenceLine[];
  clientId: string;
  projectId: string;
}

export async function buildGanttPdf(options: BuildGanttPdfOptions): Promise<Blob> {
  const { plan, lines, mayores, overrides, referenceLines = [], clientId, projectId } = options;

  try {
    // Fetch required data including matrix explanations
    const [companyResult, clientResult, projectResult, explanationsResult] = await Promise.all([
      supabase.from('company_branding').select('*').limit(1).maybeSingle(),
      supabase.from('clients').select('full_name, email, phone').eq('id', clientId).single(),
      supabase.from('client_projects').select('project_name, project_location, construction_area, land_surface_area, construction_start_date').eq('id', projectId).single(),
      supabase.from('matrix_explanations').select('*').eq('plan_id', plan.id).order('order_index', { ascending: true })
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
    const matrixExplanations = explanationsResult.data || [];

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
        referenceLines,
        matrixExplanations,
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