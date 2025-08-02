import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface Partida {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  supplier_id?: string;
}

interface ExcelImporterProps {
  onPartidasImported: (partidas: Partida[]) => void;
}

export function ExcelImporter({ onPartidasImported }: ExcelImporterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos Excel (.xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
  };

  const processExcel = async () => {
    if (!uploadedFile) return;

    setIsLoading(true);
    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Mapear datos del Excel a estructura de partidas
      const partidas: Partida[] = jsonData.map((row: any, index) => ({
        id: `partida-${index}`,
        codigo: row['Código'] || row['CODIGO'] || row['codigo'] || `P${index + 1}`,
        descripcion: row['Descripción'] || row['DESCRIPCION'] || row['descripcion'] || '',
        unidad: row['Unidad'] || row['UNIDAD'] || row['unidad'] || 'PZA',
        cantidad: parseFloat(row['Cantidad'] || row['CANTIDAD'] || row['cantidad'] || 1),
        precio_unitario: parseFloat(row['Precio Unitario'] || row['PRECIO'] || row['precio'] || 0),
        total: 0, // Se calculará automáticamente
      }));

      // Calcular totales
      partidas.forEach(partida => {
        partida.total = partida.cantidad * partida.precio_unitario;
      });

      onPartidasImported(partidas);
      
      toast({
        title: "Éxito",
        description: `Se importaron ${partidas.length} partidas correctamente`,
      });

    } catch (error) {
      console.error('Error processing Excel:', error);
      toast({
        title: "Error",
        description: "Error al procesar el archivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Partidas desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="cursor-pointer"
          />
          {uploadedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <Button 
          onClick={processExcel} 
          disabled={!uploadedFile || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>Procesando...</>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Procesar Excel
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Formato esperado: Código, Descripción, Unidad, Cantidad, Precio Unitario
        </div>
      </CardContent>
    </Card>
  );
}