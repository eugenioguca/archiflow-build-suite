import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Upload, Plus } from "lucide-react";
import { UnifiedTransactionForm } from "./UnifiedTransactionForm";
import { UnifiedTransactionsTable } from "./UnifiedTransactionsTable";
import { ChartOfAccountsManager } from "./ChartOfAccountsManager";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function UnifiedFinancialTransactions() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [showForm, setShowForm] = useState(false);

  const downloadTemplate = () => {
    // Create template structure for Excel
    const mayorData = [
      ["Departamento", "Código Mayor", "Nombre Mayor"],
      ["ventas", "VEN001", "Ejemplo Mayor Ventas"],
      ["construccion", "CON001", "Ejemplo Mayor Construcción"],
      ["finanzas", "FIN001", "Ejemplo Mayor Finanzas"]
    ];

    const partidasData = [
      ["Código Mayor", "Código Partida", "Nombre Partida"],
      ["VEN001", "VEN001-001", "Ejemplo Partida 1"],
      ["VEN001", "VEN001-002", "Ejemplo Partida 2"],
      ["CON001", "CON001-001", "Ejemplo Partida Construcción"]
    ];

    const subpartidasData = [
      ["Código Partida", "Código Subpartida", "Nombre Subpartida"],
      ["VEN001-001", "VEN001-001-001", "Ejemplo Subpartida 1"],
      ["VEN001-001", "VEN001-001-002", "Ejemplo Subpartida 2"],
      ["CON001-001", "CON001-001-001", "Ejemplo Subpartida Construcción"]
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Add worksheets
    const mayorSheet = XLSX.utils.aoa_to_sheet(mayorData);
    const partidasSheet = XLSX.utils.aoa_to_sheet(partidasData);
    const subpartidasSheet = XLSX.utils.aoa_to_sheet(subpartidasData);
    
    XLSX.utils.book_append_sheet(workbook, mayorSheet, "Mayores");
    XLSX.utils.book_append_sheet(workbook, partidasSheet, "Partidas");
    XLSX.utils.book_append_sheet(workbook, subpartidasSheet, "Subpartidas");
    
    // Download file
    XLSX.writeFile(workbook, "template_cuentas_contables.xlsx");
    toast.success("Template descargado exitosamente");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Process the uploaded file data here
        toast.success("Archivo procesado. Implementar lógica de importación.");
        
        // Reset input
        event.target.value = '';
      } catch (error) {
        toast.error("Error al procesar el archivo");
        console.error("Error processing file:", error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transacciones Unificadas (Desarrollo)</h1>
          <p className="text-muted-foreground">
            Módulo temporal para desarrollo del sistema unificado de transacciones financieras
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Descargar Template
          </Button>
          <label htmlFor="excel-upload">
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Cargar Excel
              </span>
            </Button>
          </label>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="chart-accounts">Catálogo de Cuentas</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transacciones Financieras Unificadas</CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Transacción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedTransactionsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart-accounts" className="space-y-6">
          <ChartOfAccountsManager />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reportes y Análisis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Reportes y análisis del sistema unificado - Pendiente de implementación
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showForm && (
        <UnifiedTransactionForm 
          open={showForm} 
          onOpenChange={setShowForm}
        />
      )}
    </div>
  );
}