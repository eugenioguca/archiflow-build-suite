import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const generatePDF = async () => {
    try {
      // Create a temporary div for the PDF content
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm';
      tempDiv.style.backgroundColor = 'white';
      
      tempDiv.innerHTML = `
        <div style="
          font-family: system-ui, -apple-system, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background: white;
          padding: 40px;
          min-height: 297mm;
        ">
          <!-- Header with Logo -->
          <div style="
            background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #f97316 100%);
            color: white;
            padding: 40px;
            margin: -40px -40px 40px -40px;
            border-radius: 0 0 24px 24px;
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
                style="height: 60px; width: auto; margin-bottom: 20px; filter: brightness(0) invert(1);"
              />
              <h1 style="
                font-size: 32px;
                font-weight: 700;
                margin: 0;
                background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
              ">PRESUPUESTO DE CONSTRUCCIÓN</h1>
              <div style="
                font-size: 16px;
                opacity: 0.9;
                margin-top: 8px;
                color: #e2e8f0;
              ">Gestión Inteligente para Arquitectos y Constructores</div>
            </div>
          </div>

          <!-- Date -->
          <div style="
            text-align: right;
            color: #64748b;
            font-size: 14px;
            margin-bottom: 24px;
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
            padding: 32px;
            border-radius: 16px;
            margin-bottom: 32px;
            border-left: 6px solid #f97316;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          ">
            <h2 style="
              color: #1e293b;
              margin: 0 0 20px 0;
              font-size: 24px;
              font-weight: 700;
            ">Información del Proyecto</h2>
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
            ">
              <div>
                <div style="
                  font-weight: 700;
                  color: #475569;
                  margin-bottom: 6px;
                  font-size: 12px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                ">Cliente</div>
                <div style="
                  color: #1e293b;
                  font-size: 16px;
                  font-weight: 500;
                ">${clientName}</div>
              </div>
              <div>
                <div style="
                  font-weight: 700;
                  color: #475569;
                  margin-bottom: 6px;
                  font-size: 12px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                ">Proyecto</div>
                <div style="
                  color: #1e293b;
                  font-size: 16px;
                  font-weight: 500;
                ">${projectName}</div>
              </div>
              <div>
                <div style="
                  font-weight: 700;
                  color: #475569;
                  margin-bottom: 6px;
                  font-size: 12px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                ">Presupuesto</div>
                <div style="
                  color: #1e293b;
                  font-size: 16px;
                  font-weight: 500;
                ">${budget.budget_name}</div>
              </div>
              <div>
                <div style="
                  font-weight: 700;
                  color: #475569;
                  margin-bottom: 6px;
                  font-size: 12px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                ">Estado</div>
                <div style="
                  color: #1e293b;
                  font-size: 16px;
                  font-weight: 500;
                ">${budget.status === 'draft' ? 'Borrador' : 
                  budget.status === 'approved' ? 'Aprobado' : 
                  budget.status === 'pending' ? 'Pendiente' : budget.status}</div>
              </div>
            </div>
          </div>
          
          <!-- Budget Table -->
          <div style="
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-bottom: 32px;
          ">
            <table style="
              width: 100%;
              border-collapse: collapse;
              background: white;
            ">
              <thead>
                <tr style="
                  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
                  color: white;
                ">
                  <th style="
                    padding: 20px 16px;
                    text-align: left;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 12px;
                    width: 40%;
                  ">Partida</th>
                  <th style="
                    padding: 20px 16px;
                    text-align: center;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 12px;
                    width: 15%;
                  ">Cantidad</th>
                  <th style="
                    padding: 20px 16px;
                    text-align: right;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 12px;
                    width: 20%;
                  ">Precio Unitario</th>
                  <th style="
                    padding: 20px 16px;
                    text-align: right;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 12px;
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
                    <td style="padding: 16px;">
                      <div style="
                        font-weight: 600;
                        color: #1e293b;
                        margin-bottom: 4px;
                      ">${item.item_name}</div>
                      ${item.description ? `<div style="
                        color: #64748b;
                        font-size: 14px;
                      ">${item.description}</div>` : ''}
                    </td>
                    <td style="
                      padding: 16px;
                      text-align: center;
                      font-weight: 500;
                      color: #374151;
                    ">${item.quantity.toLocaleString()}</td>
                    <td style="
                      padding: 16px;
                      text-align: right;
                      font-weight: 500;
                      color: #374151;
                    ">${formatCurrency(item.unit_price)}</td>
                    <td style="
                      padding: 16px;
                      text-align: right;
                      font-weight: 600;
                      color: #1e293b;
                    ">${formatCurrency(item.total_price)}</td>
                  </tr>
                `).join('')}
                <tr style="
                  background: linear-gradient(135deg, #1e293b 0%, #f97316 100%);
                  color: white;
                ">
                  <td colspan="3" style="
                    padding: 24px 16px;
                    font-weight: 700;
                    font-size: 18px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                  ">TOTAL GENERAL</td>
                  <td style="
                    padding: 24px 16px;
                    text-align: right;
                    font-weight: 700;
                    font-size: 20px;
                  ">${formatCurrency(budget.total_amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Footer -->
          <div style="
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 32px;
            border-radius: 16px;
            text-align: center;
            border-top: 6px solid #f97316;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          ">
            <div style="
              color: #475569;
              margin-bottom: 12px;
              font-size: 14px;
            ">Este presupuesto es válido por 30 días a partir de la fecha de emisión</div>
            <div style="
              color: #475569;
              margin-bottom: 12px;
              font-size: 14px;
            ">Todos los precios están expresados en pesos mexicanos (MXN)</div>
            <div style="
              font-weight: 700;
              color: #1e293b;
              font-size: 16px;
            ">Para más información contacta a tu asesor asignado</div>
          </div>
        </div>
      `;

      document.body.appendChild(tempDiv);

      // Generate PDF using html2canvas and jsPDF
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123 // A4 height in pixels at 96 DPI
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
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
    <Button onClick={generatePDF} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
}