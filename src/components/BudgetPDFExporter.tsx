import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Eye, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BudgetItem {
  id: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_order: number;
}

interface ProjectBudget {
  id: string;
  project_id: string;
  budget_name: string;
  total_amount: number;
  status: string;
  created_by: string;
  items?: BudgetItem[];
}

interface BudgetPDFExporterProps {
  budget: ProjectBudget;
  items: BudgetItem[];
  projectName: string;
  clientName: string;
}

export function BudgetPDFExporter({ budget, items, projectName, clientName }: BudgetPDFExporterProps) {
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [saving, setSaving] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const generateHtmlContent = () => {
    return `
      <div style="
        font-family: system-ui, -apple-system, sans-serif;
        line-height: 1.4;
        color: #1e293b;
        background: white;
        padding: 20px;
        min-height: 279mm;
        width: 216mm;
        box-sizing: border-box;
      ">
        <!-- Header with Logo -->
        <div style="
          background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #f97316 100%);
          color: white;
          padding: 20px;
          margin: -20px -20px 20px -20px;
          border-radius: 0 0 16px 16px;
          position: relative;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.08)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.06)"/></svg>');
          "></div>
          
          <div style="text-align: center; position: relative; z-index: 2;">
            <img 
              src="/lovable-uploads/7a3755e3-978f-4182-af7d-1db88590b5a4.png" 
              alt="Dovita Arquitectura" 
              style="height: 40px; width: auto; margin-bottom: 12px; filter: brightness(0) invert(1);"
            />
            <h1 style="
              font-size: 24px;
              font-weight: 700;
              margin: 0;
              color: white;
            ">PRESUPUESTO DE CONSTRUCCIÓN</h1>
            <div style="
              font-size: 14px;
              opacity: 0.9;
              margin-top: 4px;
              color: #e2e8f0;
            ">Gestión Inteligente para Arquitectos y Constructores</div>
          </div>
        </div>

        <!-- Date -->
        <div style="
          text-align: right;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 16px;
          font-style: italic;
        ">
          Generado el: ${new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        
        <!-- Project Info -->
        <div style="
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          border-left: 4px solid #f97316;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        ">
          <h2 style="
            color: #1e293b;
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 700;
          ">Información del Proyecto</h2>
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
          ">
            <div>
              <div style="
                font-weight: 700;
                color: #475569;
                margin-bottom: 4px;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
              ">Cliente</div>
              <div style="
                color: #1e293b;
                font-size: 14px;
                font-weight: 500;
              ">${clientName}</div>
            </div>
            <div>
              <div style="
                font-weight: 700;
                color: #475569;
                margin-bottom: 4px;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
              ">Proyecto</div>
              <div style="
                color: #1e293b;
                font-size: 14px;
                font-weight: 500;
              ">${projectName}</div>
            </div>
            <div>
              <div style="
                font-weight: 700;
                color: #475569;
                margin-bottom: 4px;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
              ">Presupuesto</div>
              <div style="
                color: #1e293b;
                font-size: 14px;
                font-weight: 500;
              ">${budget.budget_name}</div>
            </div>
          </div>
        </div>
        
        <!-- Budget Table -->
        <div style="
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        ">
          <table style="
            width: 100%;
            border-collapse: collapse;
            background: white;
            font-size: 12px;
          ">
            <thead>
              <tr style="
                background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
                color: white;
              ">
                <th style="
                  padding: 12px 8px;
                  text-align: left;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  font-size: 10px;
                  width: 40%;
                ">Partida</th>
                <th style="
                  padding: 12px 8px;
                  text-align: center;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  font-size: 10px;
                  width: 15%;
                ">Cantidad</th>
                <th style="
                  padding: 12px 8px;
                  text-align: right;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  font-size: 10px;
                  width: 20%;
                ">Precio Unitario</th>
                <th style="
                  padding: 12px 8px;
                  text-align: right;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  font-size: 10px;
                  width: 25%;
                ">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr style="
                  background-color: ${index % 2 === 0 ? '#f8fafc' : 'white'};
                  border-bottom: 1px solid #e2e8f0;
                ">
                  <td style="padding: 10px 8px;">
                    <div style="
                      font-weight: 600;
                      color: #1e293b;
                      margin-bottom: 2px;
                      font-size: 12px;
                    ">${item.item_name}</div>
                    ${item.description ? `<div style="
                      color: #64748b;
                      font-size: 10px;
                      line-height: 1.3;
                    ">${item.description}</div>` : ''}
                  </td>
                  <td style="
                    padding: 10px 8px;
                    text-align: center;
                    font-weight: 500;
                    color: #374151;
                    font-size: 12px;
                  ">${item.quantity.toLocaleString()}</td>
                  <td style="
                    padding: 10px 8px;
                    text-align: right;
                    font-weight: 500;
                    color: #374151;
                    font-size: 12px;
                  ">${formatCurrency(item.unit_price)}</td>
                  <td style="
                    padding: 10px 8px;
                    text-align: right;
                    font-weight: 600;
                    color: #1e293b;
                    font-size: 12px;
                  ">${formatCurrency(item.total_price)}</td>
                </tr>
              `).join('')}
              <tr style="
                background: linear-gradient(135deg, #1e293b 0%, #f97316 100%);
                color: white;
              ">
                <td colspan="3" style="
                  padding: 16px 8px;
                  font-weight: 700;
                  font-size: 14px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                ">TOTAL GENERAL</td>
                <td style="
                  padding: 16px 8px;
                  text-align: right;
                  font-weight: 700;
                  font-size: 16px;
                ">${formatCurrency(budget.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
        <div style="
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          border-top: 3px solid #f97316;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-top: 20px;
        ">
          <div style="
            color: #475569;
            margin-bottom: 8px;
            font-size: 11px;
          ">Este presupuesto es válido por 30 días a partir de la fecha de emisión</div>
          <div style="
            color: #475569;
            margin-bottom: 8px;
            font-size: 11px;
          ">Todos los precios están expresados en pesos mexicanos (MXN)</div>
          <div style="
            font-weight: 700;
            color: #1e293b;
            font-size: 12px;
          ">Para más información contacta a tu asesor asignado</div>
        </div>
      </div>
    `;
  };

  const showPreview = () => {
    const htmlContent = generateHtmlContent();
    setPreviewHtml(htmlContent);
    setPreviewOpen(true);
  };

  const saveBudgetToProject = async () => {
    setSaving(true);
    try {
      // Generate PDF first
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.innerHTML = generateHtmlContent();

      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 816, // Letter size width
        height: 1056 // Letter size height
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter'); // Letter size instead of A4
      
      const imgWidth = 216; // Letter width in mm
      const pageHeight = 279; // Letter height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Only add content if there's actual content to display
      if (imgHeight > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Only add new pages if content actually extends beyond first page
        while (heightLeft >= pageHeight * 0.1) { // Add threshold to avoid mostly empty pages
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      // Convert PDF to blob
      const pdfBlob = pdf.output('blob');
      
      // Generate filename
      const fileName = `presupuesto_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(`${budget.project_id}/${fileName}`, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      // Get client info for the project
      const { data: projectData } = await supabase
        .from("client_projects")
        .select("client_id")
        .eq("id", budget.project_id)
        .single();

      // Save document record to database
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          name: `Presupuesto - ${budget.budget_name}`,
          description: `Presupuesto de construcción generado el ${new Date().toLocaleDateString('es-MX')}`,
          file_path: uploadData.path,
          file_type: 'application/pdf',
          file_size: pdfBlob.size,
          project_id: budget.project_id,
          client_id: projectData?.client_id,
          uploaded_by: profile.id,
          department: 'design',
          category: 'presupuesto',
          access_level: 'client',
          department_permissions: ['design', 'construction', 'sales']
        });

      if (docError) throw docError;

      toast({
        title: "Presupuesto Guardado",
        description: "El presupuesto se ha guardado correctamente en el expediente del proyecto",
      });

    } catch (error: any) {
      console.error('Error saving budget:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el presupuesto. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.innerHTML = generateHtmlContent();

      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 816, // Letter size width
        height: 1056 // Letter size height
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter'); // Letter size instead of A4
      
      const imgWidth = 216; // Letter width in mm
      const pageHeight = 279; // Letter height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Only add content if there's actual content to display
      if (imgHeight > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Only add new pages if content actually extends beyond first page
        while (heightLeft >= pageHeight * 0.1) { // Add threshold to avoid mostly empty pages
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const fileName = `Presupuesto_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Generado",
        description: "El presupuesto se ha exportado correctamente",
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={showPreview} variant="outline" className="gap-2">
          <Eye className="h-4 w-4" />
          Vista Previa
        </Button>
        
        <Button 
          onClick={saveBudgetToProject} 
          variant="outline" 
          className="gap-2"
          disabled={saving}
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Presupuesto"}
        </Button>
        
        <Button onClick={generatePDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Presupuesto</DialogTitle>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}