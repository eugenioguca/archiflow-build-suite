import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, FileText, Search, Calculator, Filter, ArrowUpDown, Info, FileX, AlertCircle } from 'lucide-react';
import { useExecutiveFinalBudget, type FinalBudgetRow } from './hooks/useExecutiveFinalBudget';
import { pdf } from '@react-pdf/renderer';
import { ExecutiveFinalPdf } from './ExecutiveFinalPdf';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ExecutiveFinalViewProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

interface FilterState {
  searchTerm: string;
  departmentFilter: string;
  statusFilter: string;
  sortBy: 'mayor' | 'partida' | 'importe';
  sortOrder: 'asc' | 'desc';
  showOnlyNegativeResiduals: boolean;
  groupByMayor: boolean;
}

export default function ExecutiveFinalView({ selectedClientId, selectedProjectId }: ExecutiveFinalViewProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    departmentFilter: 'all',
    statusFilter: 'all',
    sortBy: 'mayor',
    sortOrder: 'asc',
    showOnlyNegativeResiduals: false,
    groupByMayor: false
  });
  
  const [selectedRowForDetails, setSelectedRowForDetails] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const hasFilters = Boolean(selectedClientId && selectedProjectId);

  // Load data
  const { 
    finalRows, 
    totals, 
    groupedByMayor, 
    companySettings, 
    isLoading, 
    hasData 
  } = useExecutiveFinalBudget(selectedClientId, selectedProjectId);

  const { toast } = useToast();

  // Filter and sort rows with grouping support
  const { filteredRows, groupedRows, departments } = useMemo(() => {
    let filtered = [...finalRows];
    
    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        row.departamento.toLowerCase().includes(searchLower) ||
        row.mayor_nombre.toLowerCase().includes(searchLower) ||
        row.partida_nombre.toLowerCase().includes(searchLower) ||
        (row.subpartida_nombre && row.subpartida_nombre.toLowerCase().includes(searchLower)) ||
        (row.subpartida_codigo && row.subpartida_codigo.toLowerCase().includes(searchLower)) ||
        (row.mayor_codigo && row.mayor_codigo.toLowerCase().includes(searchLower)) ||
        (row.partida_codigo && row.partida_codigo.toLowerCase().includes(searchLower))
      );
    }

    // Department filter
    if (filters.departmentFilter !== 'all') {
      filtered = filtered.filter(row => row.departamento === filters.departmentFilter);
    }

    // Status filter
    if (filters.statusFilter !== 'all') {
      if (filters.statusFilter === 'dentro' && filters.showOnlyNegativeResiduals) {
        filtered = filtered.filter(row => row.tipo === 'residual' && row.estado === 'dentro');
      } else if (filters.statusFilter === 'excedido') {
        filtered = filtered.filter(row => row.tipo === 'residual' && row.estado === 'excedido');
      } else if (filters.statusFilter === 'residual') {
        filtered = filtered.filter(row => row.tipo === 'residual');
      } else if (filters.statusFilter === 'subpartidas') {
        filtered = filtered.filter(row => row.tipo === 'subpartida');
      }
    }

    // Show only negative residuals
    if (filters.showOnlyNegativeResiduals && filters.statusFilter === 'all') {
      filtered = filtered.filter(row => 
        row.tipo !== 'residual' || (row.tipo === 'residual' && row.importe < 0)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'mayor':
          comparison = a.mayor_nombre.localeCompare(b.mayor_nombre);
          if (comparison === 0) {
            comparison = a.partida_nombre.localeCompare(b.partida_nombre);
          }
          break;
        case 'partida':
          comparison = a.partida_nombre.localeCompare(b.partida_nombre);
          break;
        case 'importe':
          comparison = Math.abs(a.importe) - Math.abs(b.importe);
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    // Group by Mayor if enabled
    const grouped = new Map<string, { mayor: string, rows: FinalBudgetRow[], total: number }>();
    
    if (filters.groupByMayor) {
      filtered.forEach(row => {
        const mayorKey = `${row.mayor_id}-${row.mayor_nombre}`;
        if (!grouped.has(mayorKey)) {
          grouped.set(mayorKey, {
            mayor: `${row.mayor_codigo} - ${row.mayor_nombre}`,
            rows: [],
            total: 0
          });
        }
        grouped.get(mayorKey)!.rows.push(row);
        grouped.get(mayorKey)!.total += row.importe;
      });
    }

    // Extract unique departments
    const uniqueDepartments = Array.from(new Set(finalRows.map(row => row.departamento)));

    return { 
      filteredRows: filtered, 
      groupedRows: grouped,
      departments: uniqueDepartments 
    };
  }, [finalRows, filters]);

  // Get subpartidas for selected residual row
  const getSubpartidasForRow = (parametricoId: string) => {
    return finalRows.filter(row => 
      row.parametrico_partida_id === parametricoId && row.tipo === 'subpartida'
    );
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!hasData) return;
    
    setIsExporting(true);
    try {
      // Prepare data for export (respect grouping and filters)
      let exportData: any[] = [];
      
      if (filters.groupByMayor && groupedRows.size > 0) {
        // Export with grouping
        for (const [mayorKey, group] of groupedRows.entries()) {
          // Add group header
          exportData.push({
            Departamento: '',
            Mayor: `=== ${group.mayor} ===`,
            Partida: '',
            Subpartida: '',
            Unidad: '',
            Cantidad: '',
            'P.U.': '',
            Importe: group.total,
            Origen: `Total: $${group.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          });
          
          // Add group rows
          group.rows.forEach(row => {
            exportData.push({
              Departamento: row.departamento,
              Mayor: `${row.mayor_codigo} - ${row.mayor_nombre}`,
              Partida: `${row.partida_codigo} - ${row.partida_nombre}`,
              Subpartida: row.subpartida_nombre 
                ? `${row.subpartida_codigo} - ${row.subpartida_nombre}`
                : '—',
              Unidad: row.unidad || '—',
              Cantidad: row.cantidad || '—',
              'P.U.': row.precio_unitario || '—',
              Importe: row.importe,
              Origen: row.tipo === 'residual' 
                ? (row.estado === 'excedido' ? 'Excedido' : 'Residual')
                : 'Subpartida'
            });
          });
          
          // Add empty row for separation
          exportData.push({});
        }
      } else {
        // Export without grouping
        exportData = filteredRows.map(row => ({
          Departamento: row.departamento,
          Mayor: `${row.mayor_codigo} - ${row.mayor_nombre}`,
          Partida: `${row.partida_codigo} - ${row.partida_nombre}`,
          Subpartida: row.subpartida_nombre 
            ? `${row.subpartida_codigo} - ${row.subpartida_nombre}`
            : '—',
          Unidad: row.unidad || '—',
          Cantidad: row.cantidad || '—',
          'P.U.': row.precio_unitario || '—',
          Importe: row.importe,
          Origen: row.tipo === 'residual' 
            ? (row.estado === 'excedido' ? 'Excedido' : 'Residual')
            : 'Subpartida'
        }));
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Departamento
        { wch: 25 }, // Mayor
        { wch: 25 }, // Partida
        { wch: 30 }, // Subpartida
        { wch: 10 }, // Unidad
        { wch: 12 }, // Cantidad
        { wch: 15 }, // P.U.
        { wch: 15 }, // Importe
        { wch: 15 }  // Origen
      ];
      ws['!cols'] = colWidths;
      
      // Freeze first row
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      
      // Format currency columns (P.U. and Importe)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let row = 1; row <= range.e.r; row++) {
        const puCell = XLSX.utils.encode_cell({ r: row, c: 6 }); // P.U. column
        const importeCell = XLSX.utils.encode_cell({ r: row, c: 7 }); // Importe column
        
        if (ws[puCell] && typeof ws[puCell].v === 'number') {
          ws[puCell].z = '"$"#,##0.00';
        }
        if (ws[importeCell] && typeof ws[importeCell].v === 'number') {
          ws[importeCell].z = '"$"#,##0.00';
        }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, 'Vista Final');
      
      // Generate filename
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1_$2');
      const filename = `Vista-Final_Cliente_Proyecto_${timestamp}.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, filename);
      
      toast({
        title: "Excel Generado",
        description: `Los datos se han exportado como ${filename}`
      });
      
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Error al exportar",
        description: 'Error al generar el archivo Excel',
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF (using same data source as Gantt)
  const handleExportPdf = async () => {
    if (!hasData || !selectedClientId || !selectedProjectId) return;
    
    setIsExporting(true);
    try {
      // Fetch data using same approach as Gantt
      const [clientResult, projectResult] = await Promise.all([
        supabase.from('clients').select('full_name, email, phone').eq('id', selectedClientId).single(),
        supabase.from('client_projects').select('project_name, project_location, construction_area, land_surface_area, construction_start_date').eq('id', selectedProjectId).single()
      ]);

      const client = clientResult.data;
      const project = projectResult.data;

      if (!client || !project) {
        throw new Error('No se encontraron los datos del cliente o proyecto');
      }

      // Use filtered rows respecting grouping
      let rowsToExport = filteredRows;
      if (filters.groupByMayor && groupedRows.size > 0) {
        // Flatten grouped data while maintaining group structure
        rowsToExport = [];
        for (const group of groupedRows.values()) {
          rowsToExport.push(...group.rows);
        }
      }

      const pdfDocument = (
        <ExecutiveFinalPdf 
          rows={rowsToExport} 
          totals={totals}
          companySettings={companySettings}
          clientName={client.full_name}
          projectName={project.project_name}
          projectData={{
            location: project.project_location,
            constructionArea: project.construction_area,
            landArea: project.land_surface_area,
            startDate: project.construction_start_date
          }}
          filters={filters}
          groupByMayor={filters.groupByMayor}
          groupedData={groupedRows}
        />
      );

      const pdfBlob = await pdf(pdfDocument).toBlob();
      const url = URL.createObjectURL(pdfBlob);
      
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1_$2');
      const filename = `Vista-Final_${client.full_name}_${project.project_name}_${timestamp}.pdf`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Generado",
        description: `El documento se ha exportado como ${filename}`
      });
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error al exportar",
        description: error instanceof Error ? error.message : 'Error al generar el PDF',
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!hasFilters) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/presupuestos-planeacion">Presupuestos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Vista Final</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Presupuesto Ejecutivo — Vista Final</h1>
          <p className="text-muted-foreground text-lg">
            Vista consolidada lista para revisión y exportación
          </p>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Selecciona Cliente y Proyecto</h3>
            <p className="text-muted-foreground">
              Utiliza los filtros superiores para seleccionar un cliente y proyecto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/presupuestos-planeacion">Presupuestos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Vista Final</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando datos del presupuesto...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/presupuestos-planeacion">Presupuestos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Vista Final</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <FileX className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay datos del presupuesto ejecutivo</h3>
            <p className="text-muted-foreground mb-4">
              Crea subpartidas en el presupuesto ejecutivo para ver la vista final.
            </p>
            <Button asChild>
              <a href="/presupuestos-planeacion">Ir a Presupuesto Ejecutivo</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/presupuestos-planeacion">Presupuestos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Vista Final</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Vista Final del Presupuesto</h1>
            <p className="text-muted-foreground text-lg">
              Tabla consolidada con residuales paramétricos y subpartidas ejecutivas
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportExcel}
              disabled={isExporting || !hasData}
              data-testid="export-excel"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Generando...' : 'Excel'}
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleExportPdf}
              disabled={isExporting || !hasData}
              data-testid="export-pdf"
            >
              <FileText className="h-4 w-4" />
              {isExporting ? 'Generando...' : 'PDF'}
            </Button>
          </div>
        </div>

        {/* KPI Cards - Sticky */}
        <Card className="sticky top-0 z-10 bg-background/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Totales Consolidados
              {totals.residualesExcedidos > 0 && (
                <Badge variant="destructive" className="ml-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {totals.residualesExcedidos} partidas excedidas
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Paramétrico</p>
                <p className="text-2xl font-bold text-primary">
                  ${totals.totalParametrico.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{totals.partidasCount} partidas</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Ejecutivo</p>
                <p className="text-2xl font-bold">
                  ${totals.totalEjecutivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{totals.subpartidasCount} subpartidas</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Residual</p>
                <p className={`text-2xl font-bold ${totals.totalResidual >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  ${totals.totalResidual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {totals.totalResidual >= 0 ? 'Disponible' : 'Sobrepresupuesto'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Diferencia</p>
                <p className={`text-2xl font-bold ${Math.abs(totals.diferencia) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                  ${Math.abs(totals.diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.abs(totals.diferencia) < 0.01 ? 'Cuadra exacto' : 'Hay diferencia'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters Toolbar - Sticky */}
        <Card className="sticky top-32 z-9 bg-background/80 backdrop-blur">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Main filters row */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en partida, subpartida, mayor o código..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                
                <Select 
                  value={filters.departmentFilter} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, departmentFilter: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={filters.statusFilter} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, statusFilter: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="residual">Solo residuales</SelectItem>
                    <SelectItem value="subpartidas">Solo subpartidas</SelectItem>
                    <SelectItem value="dentro">Dentro de presupuesto</SelectItem>
                    <SelectItem value="excedido">Excedido</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select 
                  value={`${filters.sortBy}-${filters.sortOrder}`} 
                  onValueChange={(value) => {
                    const [sortBy, sortOrder] = value.split('-') as [typeof filters.sortBy, typeof filters.sortOrder];
                    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
                  }}
                >
                  <SelectTrigger className="w-48">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mayor-asc">Mayor A-Z</SelectItem>
                    <SelectItem value="mayor-desc">Mayor Z-A</SelectItem>
                    <SelectItem value="partida-asc">Partida A-Z</SelectItem>
                    <SelectItem value="partida-desc">Partida Z-A</SelectItem>
                    <SelectItem value="importe-asc">Importe menor</SelectItem>
                    <SelectItem value="importe-desc">Importe mayor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Advanced options row */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="negative-residuals"
                    checked={filters.showOnlyNegativeResiduals}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showOnlyNegativeResiduals: checked }))}
                  />
                  <Label htmlFor="negative-residuals">Solo residuales negativos</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="group-by-mayor"
                    checked={filters.groupByMayor}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, groupByMayor: checked }))}
                  />
                  <Label htmlFor="group-by-mayor">Agrupar por Mayor</Label>
                </div>

                <div className="text-sm text-muted-foreground ml-auto">
                  Mostrando {filteredRows.length} de {finalRows.length} registros
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-semibold">Departamento</th>
                    <th className="text-left p-4 font-semibold">Mayor</th>
                    <th className="text-left p-4 font-semibold">Partida</th>
                    <th className="text-left p-4 font-semibold">Subpartida</th>
                    <th className="text-center p-4 font-semibold">Unidad</th>
                    <th className="text-center p-4 font-semibold">Cantidad</th>
                    <th className="text-right p-4 font-semibold">P.U.</th>
                    <th className="text-right p-4 font-semibold">Importe</th>
                    <th className="text-center p-4 font-semibold">Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const isResidual = row.tipo === 'residual';
                    const isSubpartida = row.tipo === 'subpartida';

                    return (
                      <Drawer key={row.id}>
                        <DrawerTrigger asChild>
                          <tr 
                            className={`border-b hover:bg-muted/20 cursor-pointer transition-colors ${
                              isResidual ? 'bg-muted/10' : ''
                            }`}
                            onClick={() => isResidual && setSelectedRowForDetails(row.parametrico_partida_id || null)}
                          >
                            <td className="p-4 sticky left-0 bg-background">{row.departamento}</td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{row.mayor_nombre}</p>
                                <p className="text-xs text-muted-foreground">{row.mayor_codigo}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{row.partida_nombre}</p>
                                <p className="text-xs text-muted-foreground">{row.partida_codigo}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              {row.subpartida_nombre ? (
                                <div className={isSubpartida ? 'ml-4' : ''}>
                                  <p className="font-medium">
                                    {isSubpartida ? '├─ ' : ''}{row.subpartida_nombre}
                                  </p>
                                  {row.subpartida_codigo && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground cursor-help">
                                          {row.subpartida_codigo}
                                        </p>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Código de catálogo: {row.subpartida_codigo}</p>
                                        {row.unidad && <p>Unidad: {row.unidad}</p>}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {row.unidad || '—'}
                            </td>
                            <td className="p-4 text-center">
                              {row.cantidad ? row.cantidad.toLocaleString('es-MX') : '—'}
                            </td>
                            <td className="p-4 text-right">
                              {row.precio_unitario 
                                ? `$${row.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                                : '—'
                              }
                            </td>
                            <td className={`p-4 text-right font-semibold ${
                              isResidual && row.estado === 'excedido' 
                                ? 'text-destructive' 
                                : isResidual && row.importe > 0
                                ? 'text-green-600'
                                : ''
                            }`}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">
                                    ${Math.abs(row.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isResidual && (
                                    <p>Paramétrico - Suma subpartidas ejecutivas</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="p-4 text-center">
                              <Badge variant={
                                row.tipo === 'residual' 
                                  ? (row.estado === 'excedido' ? 'destructive' : 'secondary')
                                  : 'outline'
                              }>
                                {row.tipo === 'residual' 
                                  ? (row.estado === 'excedido' ? 'Excedido' : 'Residual')
                                  : 'Subpartida'
                                }
                              </Badge>
                            </td>
                          </tr>
                        </DrawerTrigger>

                        {isResidual && (
                          <DrawerContent>
                            <DrawerHeader>
                              <DrawerTitle>
                                Subpartidas de {row.partida_nombre}
                              </DrawerTitle>
                            </DrawerHeader>
                            <div className="p-4 max-h-96 overflow-y-auto">
                              {(() => {
                                const subpartidas = getSubpartidasForRow(row.parametrico_partida_id!);
                                
                                if (subpartidas.length === 0) {
                                  return (
                                    <div className="text-center py-8 text-muted-foreground">
                                      No hay subpartidas ejecutivas para esta partida
                                    </div>
                                  );
                                }

                                const total = subpartidas.reduce((sum, sub) => sum + sub.importe, 0);

                                return (
                                  <div className="space-y-2">
                                    {subpartidas.map((sub) => (
                                      <div key={sub.id} className="flex justify-between items-center p-2 bg-muted/20 rounded">
                                        <div>
                                          <p className="font-medium">{sub.subpartida_nombre}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {sub.cantidad} {sub.unidad} × ${sub.precio_unitario?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                          </p>
                                        </div>
                                        <p className="font-semibold">
                                          ${sub.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    ))}
                                    <Separator />
                                    <div className="flex justify-between items-center font-bold">
                                      <span>Total Subpartidas:</span>
                                      <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </DrawerContent>
                        )}
                      </Drawer>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredRows.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No se encontraron registros que coincidan con los filtros
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}