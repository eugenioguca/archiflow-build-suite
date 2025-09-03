import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { usePresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyInput } from '@/components/CurrencyInput';

interface PresupuestoRow {
  id?: string;
  departamento: string;
  mayor_id: string;
  partida_id: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
}

interface Option {
  id: string;
  nombre: string;
  codigo?: string;
}

// Transform Option to SearchableComboboxItem
const transformToComboboxItems = (options: Option[]) => {
  return options.map(option => ({
    value: option.id,
    label: option.nombre,
    codigo: option.codigo,
    searchText: `${option.codigo || ''} ${option.nombre}`.toLowerCase()
  }));
};

export function PresupuestoParametrico() {
  const {
    selectedClientId,
    selectedProjectId,
    setClientId,
    setProjectId,
    clearFilters,
    hasFilters
  } = useClientProjectFilters();

  const {
    presupuestos,
    isLoading,
    createPresupuesto,
    updatePresupuesto,
    deletePresupuesto
  } = usePresupuestoParametrico(selectedClientId, selectedProjectId);

  const [rows, setRows] = useState<PresupuestoRow[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  
  // Estados para opciones de dropdowns - misma lógica que UnifiedTransactionBulkForm
  const [departamentoId, setDepartamentoId] = useState<string>('');
  const [mayores, setMayores] = useState<{ value: string; label: string; codigo?: string }[]>([]);
  const [partidas, setPartidas] = useState<{ value: string; label: string; codigo?: string }[]>([]);

  // Cargar departamentos y encontrar "Construcción" - misma lógica que UnifiedTransactionBulkForm
  const loadDepartamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_departamentos')
        .select('departamento')
        .eq('activo', true)
        .order('departamento');

      if (error) throw error;

      // Evitar duplicados usando Set
      const uniqueDepartamentos = [...new Set(data?.map(item => item.departamento) || [])];
      
      // Encontrar "Construcción" y establecerlo como departamento por defecto
      const construccionDept = uniqueDepartamentos.find(dept => dept === 'Construcción');
      if (construccionDept) {
        setDepartamentoId(construccionDept);
      }
    } catch (error) {
      console.error('Error loading departamentos:', error);
    }
  };

  // Cargar mayores basado en departamento seleccionado - misma lógica que UnifiedTransactionBulkForm
  const loadMayores = async (departamentoId: string) => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_mayor')
        .select('id, nombre, codigo')
        .eq('departamento', departamentoId)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;

      const options = data?.map(item => ({
        value: item.id,
        label: item.nombre,
        codigo: item.codigo
      })) || [];

      setMayores(options);
    } catch (error) {
      console.error('Error loading mayores:', error);
      setMayores([]);
    }
  };

  // Cargar partidas basado en mayor seleccionado - misma lógica que UnifiedTransactionBulkForm
  const loadPartidas = async (mayorId: string) => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_partidas')
        .select('id, nombre, codigo')
        .eq('mayor_id', mayorId)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;

      const options = data?.map(item => ({
        value: item.id,
        label: item.nombre,
        codigo: item.codigo
      })) || [];

      setPartidas(options);
    } catch (error) {
      console.error('Error loading partidas:', error);
      setPartidas([]);
    }
  };

  // Cargar departamentos al montar el componente
  useEffect(() => {
    loadDepartamentos();
  }, []);

  // Cargar mayores cuando el departamento esté disponible
  useEffect(() => {
    if (departamentoId && hasFilters && selectedClientId && selectedProjectId) {
      loadMayores(departamentoId);
    }
  }, [departamentoId, hasFilters, selectedClientId, selectedProjectId]);

  const addRow = () => {
    const newRow: PresupuestoRow = {
      departamento: departamentoId || 'Construcción',
      mayor_id: '',
      partida_id: '',
      cantidad_requerida: 1,
      precio_unitario: 0,
      monto_total: 0
    };
    setRows([...rows, newRow]);
  };

  const updateRow = (index: number, field: keyof PresupuestoRow, value: any) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    
    // Auto-calculate monto_total
    if (field === 'cantidad_requerida' || field === 'precio_unitario') {
      updatedRows[index].monto_total = 
        updatedRows[index].cantidad_requerida * updatedRows[index].precio_unitario;
    }
    
    setRows(updatedRows);
  };

  const removeRow = (index: number) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };

  const saveRow = async (index: number) => {
    const row = rows[index];
    
    if (!selectedClientId || !selectedProjectId) {
      return;
    }

    if (!row.mayor_id || !row.partida_id) {
      return;
    }

    try {
      if (row.id) {
        await updatePresupuesto.mutateAsync({
          id: row.id,
          data: {
            mayor_id: row.mayor_id,
            partida_id: row.partida_id,
            cantidad_requerida: row.cantidad_requerida,
            precio_unitario: row.precio_unitario
          }
        });
      } else {
        await createPresupuesto.mutateAsync({
          cliente_id: selectedClientId,
          proyecto_id: selectedProjectId,
          departamento: departamentoId, // Usar departamento cargado de la DB
          mayor_id: row.mayor_id,
          partida_id: row.partida_id,
          cantidad_requerida: row.cantidad_requerida,
          precio_unitario: row.precio_unitario
        });
      }
      
      setEditingRow(null);
    } catch (error) {
      console.error('Error saving row:', error);
    }
  };

  const deleteRow = async (id: string) => {
    try {
      await deletePresupuesto.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const handleMayorChange = (index: number, mayorId: string) => {
    updateRow(index, 'mayor_id', mayorId);
    updateRow(index, 'partida_id', ''); // Reset partida when mayor changes
    setPartidas([]); // Clear partidas
    if (mayorId) {
      loadPartidas(mayorId);
    }
  };

  const totalGeneral = presupuestos.reduce((sum, item) => sum + item.monto_total, 0) +
    rows.reduce((sum, row) => sum + row.monto_total, 0);

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    // Header with Dovita logo
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DOVITA CONSTRUCCIONES', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('PRESUPUESTO PARAMÉTRICO', 105, 30, { align: 'center' });

    // Project info
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 15, 45);
    
    // Table headers
    let currentY = 60;
    const rowHeight = 8;
    const colWidths = [35, 40, 40, 25, 30, 30];
    const headers = ['Departamento', 'Mayor', 'Partida', 'Cantidad', 'P. Unitario', 'Monto Total'];
    
    // Draw headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
    
    let currentX = 15;
    headers.forEach((header, index) => {
      doc.text(header, currentX + 2, currentY + 5);
      currentX += colWidths[index];
    });
    
    currentY += rowHeight;

    // Data rows
    doc.setFont('helvetica', 'normal');
    const savedItems = presupuestos.map(item => ({
      departamento: 'Construcción',
      mayor_codigo: item.mayor ? `${item.mayor.codigo}` : '',
      partida_codigo: item.partida ? `${item.partida.codigo}` : '',
      cantidad_requerida: item.cantidad_requerida,
      precio_unitario: item.precio_unitario,
      monto_total: item.monto_total
    }));

    const validRows = rows.filter(row => row.mayor_id && row.partida_id).map(row => {
      const mayorData = mayores.find(m => m.value === row.mayor_id);
      const partidaData = partidas.find(p => p.value === row.partida_id);
      
      return {
        departamento: 'Construcción',
        mayor_codigo: mayorData ? mayorData.codigo : '',
        partida_codigo: partidaData ? partidaData.codigo : '',
        cantidad_requerida: row.cantidad_requerida,
        precio_unitario: row.precio_unitario,
        monto_total: row.monto_total
      };
    });
    
    const allItems = [...savedItems, ...validRows];
    
    allItems.forEach((item) => {
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
        
        // Redraw headers on new page
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(15, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        
        let headerX = 15;
        headers.forEach((header, index) => {
          doc.text(header, headerX + 2, currentY + 5);
          headerX += colWidths[index];
        });
        
        currentY += rowHeight;
        doc.setFont('helvetica', 'normal');
      }

      // Draw row
      currentX = 15;
      const rowData = [
        item.departamento,
        item.mayor_codigo,
        item.partida_codigo,
        item.cantidad_requerida.toString(),
        `$${item.precio_unitario.toLocaleString('es-MX')}`,
        `$${item.monto_total.toLocaleString('es-MX')}`
      ];

      rowData.forEach((data, index) => {
        doc.text(data, currentX + 2, currentY + 5);
        currentX += colWidths[index];
      });
      
      currentY += rowHeight;
    });

    // Total
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL GENERAL: $${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 
             200, currentY, { align: 'right' });

    // Save PDF
    doc.save(`Presupuesto_Parametrico_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Presupuesto Paramétrico</h1>
          <p className="text-muted-foreground">
            Gestiona el presupuesto de primer nivel presentado a clientes
          </p>
        </div>
      </div>

      <CollapsibleFilters
        selectedClientId={selectedClientId}
        selectedProjectId={selectedProjectId}
        onClientChange={setClientId}
        onProjectChange={setProjectId}
        onClearFilters={clearFilters}
      />

      {hasFilters && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Partidas del Presupuesto</CardTitle>
            <div className="flex gap-2">
              {presupuestos.length > 0 && (
                <Button onClick={exportToPDF} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </Button>
              )}
              <Button onClick={addRow} className="gap-2">
                <Plus className="h-4 w-4" />
                Añadir Partida
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Mayor</TableHead>
                    <TableHead>Partida</TableHead>
                    <TableHead>Cantidad Req.</TableHead>
                    <TableHead>Precio Unitario</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presupuestos.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="secondary">{item.departamento}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.mayor?.codigo} - {item.mayor?.nombre}
                      </TableCell>
                      <TableCell>
                        {item.partida?.codigo} - {item.partida?.nombre}
                      </TableCell>
                      <TableCell>{item.cantidad_requerida}</TableCell>
                      <TableCell>
                        ${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${item.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="secondary">Construcción</Badge>
                      </TableCell>
                       <TableCell>
                         <div className="pointer-events-auto">
                            <SearchableCombobox
                              value={row.mayor_id}
                              onValueChange={(value) => handleMayorChange(index, value)}
                              items={mayores}
                              searchPlaceholder="Buscar mayor..."
                              emptyText="No se encontraron mayores"
                              className="w-full pointer-events-auto"
                              disabled={!hasFilters || !departamentoId}
                            />
                         </div>
                       </TableCell>
                       <TableCell>
                         <div className="pointer-events-auto">
                            <SearchableCombobox
                              value={row.partida_id}
                              onValueChange={(value) => updateRow(index, 'partida_id', value)}
                              items={partidas}
                              searchPlaceholder="Buscar partida..."
                              emptyText="No se encontraron partidas"
                              className="w-full pointer-events-auto"
                              disabled={!hasFilters || !row.mayor_id}
                            />
                         </div>
                       </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={row.cantidad_requerida || ""}
                          placeholder="1"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              updateRow(index, 'cantidad_requerida', "");
                            } else {
                              const numValue = parseFloat(value);
                              updateRow(index, 'cantidad_requerida', isNaN(numValue) ? "" : numValue);
                            }
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (isNaN(value) || value <= 0) {
                              updateRow(index, 'cantidad_requerida', 1);
                            }
                          }}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <CurrencyInput
                          value={row.precio_unitario}
                          onChange={(value) => updateRow(index, 'precio_unitario', value)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${row.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                       <TableCell>
                         <div className="flex gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               saveRow(index);
                             }}
                             disabled={!row.mayor_id || !row.partida_id}
                           >
                             ✓
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               removeRow(index);
                             }}
                             className="text-red-600 hover:text-red-700"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  Total General: ${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasFilters && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">
              Selecciona un cliente y proyecto para ver y gestionar el presupuesto paramétrico.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}