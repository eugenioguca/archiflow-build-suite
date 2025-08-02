import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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
  const generatePDF = () => {
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Presupuesto - ${projectName}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.08)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.06)"/></svg>');
          }
          
          .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
          }
          
          .header-subtitle {
            font-size: 18px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
          }
          
          .content {
            padding: 40px;
          }
          
          .project-info {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            border-left: 5px solid #667eea;
          }
          
          .project-info h2 {
            color: #2d3748;
            margin-bottom: 15px;
            font-size: 24px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
          }
          
          .info-label {
            font-weight: bold;
            color: #4a5568;
            margin-bottom: 5px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-value {
            color: #2d3748;
            font-size: 16px;
          }
          
          .budget-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }
          
          .budget-table th {
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            color: white;
            padding: 20px 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 12px;
          }
          
          .budget-table td {
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
            transition: background-color 0.3s ease;
          }
          
          .budget-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          .budget-table tr:hover {
            background-color: #e2e8f0;
          }
          
          .budget-table .item-name {
            font-weight: 600;
            color: #2d3748;
          }
          
          .budget-table .description {
            color: #718096;
            font-size: 14px;
            margin-top: 5px;
          }
          
          .budget-table .amount {
            text-align: right;
            font-weight: 600;
            color: #2d3748;
          }
          
          .total-row {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            font-weight: bold !important;
          }
          
          .total-row td {
            border: none !important;
            padding: 20px 15px !important;
            font-size: 18px !important;
          }
          
          .footer {
            margin-top: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 15px;
            text-align: center;
            border-top: 5px solid #667eea;
          }
          
          .footer p {
            color: #4a5568;
            margin-bottom: 10px;
          }
          
          .footer .contact {
            font-weight: bold;
            color: #2d3748;
            font-size: 16px;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .container {
              box-shadow: none;
              border-radius: 0;
            }
          }
          
          .generated-date {
            text-align: right;
            color: #718096;
            font-size: 12px;
            margin-bottom: 20px;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DOVITA</div>
            <div class="header-subtitle">Presupuesto de Construcción</div>
          </div>
          
          <div class="content">
            <div class="generated-date">
              Generado el: ${new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            
            <div class="project-info">
              <h2>Información del Proyecto</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Cliente</div>
                  <div class="info-value">${clientName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Proyecto</div>
                  <div class="info-value">${projectName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Presupuesto</div>
                  <div class="info-value">${budget.budget_name}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Estado</div>
                  <div class="info-value">${budget.status === 'draft' ? 'Borrador' : 
                    budget.status === 'approved' ? 'Aprobado' : 
                    budget.status === 'pending' ? 'Pendiente' : budget.status}</div>
                </div>
              </div>
            </div>
            
            <table class="budget-table">
              <thead>
                <tr>
                  <th style="width: 40%">Partida</th>
                  <th style="width: 15%">Cantidad</th>
                  <th style="width: 20%">Precio Unitario</th>
                  <th style="width: 25%">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.item_name}</div>
                      ${item.description ? `<div class="description">${item.description}</div>` : ''}
                    </td>
                    <td class="amount">${item.quantity.toLocaleString()}</td>
                    <td class="amount">$${item.unit_price.toLocaleString()}</td>
                    <td class="amount">$${item.total_price.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3"><strong>TOTAL GENERAL</strong></td>
                  <td class="amount"><strong>$${budget.total_amount.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p>Este presupuesto es válido por 30 días a partir de la fecha de emisión</p>
            <p>Todos los precios están expresados en pesos mexicanos (MXN)</p>
            <p class="contact">Para más información contacta a tu asesor asignado</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Presupuesto_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={generatePDF} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
}