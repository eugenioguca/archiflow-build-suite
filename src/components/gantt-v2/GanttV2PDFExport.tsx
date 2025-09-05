import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { useToast } from '@/hooks/use-toast';
import { buildGanttPdf } from '@/pdf/GanttPdfBuilder';

interface GanttV2PDFExportProps {
  plan: GanttPlan;
  lines: GanttLine[];
  mayores: Mayor[];
  overrides: MatrixOverride[];
  clientId: string;
  projectId: string;
  className?: string;
}

export function GanttV2PDFExport({
  plan,
  lines,
  mayores,
  overrides,
  clientId,
  projectId,
  className
}: GanttV2PDFExportProps) {
  const { toast } = useToast();

  const exportToPDF = async () => {
    try {
      // Generate PDF using the new builder
      const pdfBlob = await buildGanttPdf({
        plan,
        lines,
        mayores,
        overrides,
        clientId,
        projectId
      });

      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      const filename = `Cronograma_Gantt_v2_${date}.pdf`;

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF Generado",
        description: `El cronograma se ha exportado como ${filename}`
      });

    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error al exportar",
        description: error.message || 'Error al generar el PDF',
        variant: "destructive"
      });
    }
  };

  return (
    <Button onClick={exportToPDF} variant="outline" size="sm" className={`gap-2 ${className}`}>
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
}