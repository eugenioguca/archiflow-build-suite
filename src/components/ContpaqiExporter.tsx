import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Settings, FileSpreadsheet, Plus, Calendar, Filter } from 'lucide-react';

interface ExportConfig {
  id: string;
  nombre_configuracion: string;
  empresa_bd: string;
  ejercicio: number;
  formato_exportacion: string; // Changed from union type to string
  tipo_poliza: string;
  agrupar_por: string; // Changed from union type to string
  activa: boolean;
  cuenta_ventas_default?: string; // Added missing properties
  cuenta_iva_trasladado?: string;
  cuenta_clientes_default?: string;
}

interface ExportData {
  fecha: string;
  numero_poliza: string;
  concepto: string;
  cuenta: string;
  subcuenta: string;
  auxiliar: string;
  cargo: number;
  abono: number;
  referencia: string;
  tipo_poliza: string;
}

export function ContpaqiExporter() {
  const [configs, setConfigs] = useState<ExportConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exportData, setExportData] = useState<ExportData[]>([]);
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [newConfig, setNewConfig] = useState({
    nombre_configuracion: '',
    empresa_bd: '',
    ejercicio: new Date().getFullYear(),
    formato_exportacion: 'csv' as 'csv' | 'excel' | 'xml' | 'txt',
    tipo_poliza: 'D',
    agrupar_por: 'dia' as 'dia' | 'semana' | 'mes',
    cuenta_ventas_default: '4010001',
    cuenta_iva_trasladado: '2160001',
    cuenta_clientes_default: '1050001'
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('contpaq_export_config')
        .select('*')
        .order('nombre_configuracion');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las configuraciones',
        variant: 'destructive'
      });
    }
  };

  const saveConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('contpaq_export_config')
        .insert([{
          ...newConfig,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Configuración guardada correctamente'
      });

      setShowConfigDialog(false);
      fetchConfigs();
      resetNewConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar la configuración',
        variant: 'destructive'
      });
    }
  };

  const resetNewConfig = () => {
    setNewConfig({
      nombre_configuracion: '',
      empresa_bd: '',
      ejercicio: new Date().getFullYear(),
      formato_exportacion: 'csv',
      tipo_poliza: 'D',
      agrupar_por: 'dia',
      cuenta_ventas_default: '4010001',
      cuenta_iva_trasladado: '2160001',
      cuenta_clientes_default: '1050001'
    });
  };

  const generateExportData = async () => {
    if (!selectedConfig) {
      toast({
        title: 'Error',
        description: 'Selecciona una configuración de exportación',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get configuration
      const config = configs.find(c => c.id === selectedConfig);
      if (!config) throw new Error('Configuración no encontrada');

      // Fetch invoices in date range
      const { data: invoices, error } = await supabase
        .from('electronic_invoices')
        .select(`
          *
        `)
        .eq('estatus', 'timbrada')
        .gte('fecha_emision', dateRange.start)
        .lte('fecha_emision', dateRange.end)
        .order('fecha_emision');

      if (error) throw error;

      // Process invoices into CONTPAQi format
      const processedData: ExportData[] = [];
      let polizaCounter = 1;

      invoices?.forEach((invoice, index) => {
        const fecha = new Date(invoice.fecha_emision).toISOString().split('T')[0];
        const numeroPoliza = `${config.tipo_poliza}${polizaCounter.toString().padStart(4, '0')}`;
        const cliente = invoice.receptor_razon_social;

        // Entry for client account (Debit)
        processedData.push({
          fecha,
          numero_poliza: numeroPoliza,
          concepto: `Factura ${invoice.serie}-${invoice.folio} - ${cliente}`,
          cuenta: config.cuenta_clientes_default || '1050001',
          subcuenta: '000',
          auxiliar: invoice.receptor_rfc,
          cargo: invoice.total,
          abono: 0,
          referencia: `${invoice.serie}-${invoice.folio}`,
          tipo_poliza: config.tipo_poliza
        });

        // Entry for sales account (Credit)
        processedData.push({
          fecha,
          numero_poliza: numeroPoliza,
          concepto: `Factura ${invoice.serie}-${invoice.folio} - ${cliente}`,
          cuenta: config.cuenta_ventas_default || '4010001',
          subcuenta: '000',
          auxiliar: '',
          cargo: 0,
          abono: invoice.subtotal,
          referencia: `${invoice.serie}-${invoice.folio}`,
          tipo_poliza: config.tipo_poliza
        });

        // Entry for VAT (Credit)
        if (invoice.total_impuestos_trasladados > 0) {
          processedData.push({
            fecha,
            numero_poliza: numeroPoliza,
            concepto: `IVA Factura ${invoice.serie}-${invoice.folio} - ${cliente}`,
            cuenta: config.cuenta_iva_trasladado || '2160001',
            subcuenta: '000',
            auxiliar: '',
            cargo: 0,
            abono: invoice.total_impuestos_trasladados,
            referencia: `${invoice.serie}-${invoice.folio}`,
            tipo_poliza: config.tipo_poliza
          });
        }

        polizaCounter++;
      });

      setExportData(processedData);
      
      toast({
        title: 'Éxito',
        description: `Se generaron ${processedData.length} asientos contables`
      });

    } catch (error) {
      console.error('Error generating export data:', error);
      toast({
        title: 'Error',
        description: 'Error al generar los datos de exportación',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = (format: string) => {
    if (exportData.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay datos para exportar',
        variant: 'destructive'
      });
      return;
    }

    const config = configs.find(c => c.id === selectedConfig);
    if (!config) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'csv':
        const headers = ['Fecha', 'Numero_Poliza', 'Concepto', 'Cuenta', 'Subcuenta', 'Auxiliar', 'Cargo', 'Abono', 'Referencia', 'Tipo_Poliza'];
        const csvData = [
          headers.join(','),
          ...exportData.map(row => [
            row.fecha,
            row.numero_poliza,
            `"${row.concepto}"`,
            row.cuenta,
            row.subcuenta,
            row.auxiliar,
            row.cargo.toFixed(2),
            row.abono.toFixed(2),
            row.referencia,
            row.tipo_poliza
          ].join(','))
        ];
        content = csvData.join('\n');
        filename = `contpaq_export_${dateRange.start}_${dateRange.end}.csv`;
        mimeType = 'text/csv';
        break;

      case 'txt':
        // Fixed-width format for CONTPAQi
        const txtData = exportData.map(row => 
          `${row.fecha.padEnd(10)}${row.numero_poliza.padEnd(10)}${row.concepto.substring(0, 50).padEnd(50)}${row.cuenta.padEnd(15)}${row.subcuenta.padEnd(5)}${row.auxiliar.padEnd(20)}${row.cargo.toFixed(2).padStart(15)}${row.abono.toFixed(2).padStart(15)}${row.referencia.padEnd(20)}${row.tipo_poliza.padEnd(2)}`
        );
        content = txtData.join('\n');
        filename = `contpaq_export_${dateRange.start}_${dateRange.end}.txt`;
        mimeType = 'text/plain';
        break;

      default:
        toast({
          title: 'Error',
          description: 'Formato no soportado',
          variant: 'destructive'
        });
        return;
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: 'Éxito',
      description: `Archivo ${filename} descargado correctamente`
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Exportación CONTPAQi</h3>
          <p className="text-muted-foreground">
            Exporta facturas en formato compatible con CONTPAQi Contabilidad
          </p>
        </div>
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Configuración
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva Configuración de Exportación</DialogTitle>
              <DialogDescription>
                Configura los parámetros para la exportación a CONTPAQi
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre_configuracion">Nombre de Configuración</Label>
                  <Input
                    id="nombre_configuracion"
                    value={newConfig.nombre_configuracion}
                    onChange={(e) => setNewConfig({ ...newConfig, nombre_configuracion: e.target.value })}
                    placeholder="Configuración Principal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa_bd">Base de Datos Empresa</Label>
                  <Input
                    id="empresa_bd"
                    value={newConfig.empresa_bd}
                    onChange={(e) => setNewConfig({ ...newConfig, empresa_bd: e.target.value })}
                    placeholder="EMPRESA01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ejercicio">Ejercicio</Label>
                  <Input
                    id="ejercicio"
                    type="number"
                    value={newConfig.ejercicio}
                    onChange={(e) => setNewConfig({ ...newConfig, ejercicio: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formato_exportacion">Formato</Label>
                  <Select value={newConfig.formato_exportacion} onValueChange={(value: any) => setNewConfig({ ...newConfig, formato_exportacion: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="txt">TXT (Ancho Fijo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_poliza">Tipo de Póliza</Label>
                  <Select value={newConfig.tipo_poliza} onValueChange={(value) => setNewConfig({ ...newConfig, tipo_poliza: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="D">D - Diario</SelectItem>
                      <SelectItem value="I">I - Ingresos</SelectItem>
                      <SelectItem value="E">E - Egresos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agrupar_por">Agrupar Por</Label>
                  <Select value={newConfig.agrupar_por} onValueChange={(value: any) => setNewConfig({ ...newConfig, agrupar_por: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dia">Día</SelectItem>
                      <SelectItem value="semana">Semana</SelectItem>
                      <SelectItem value="mes">Mes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cuentas Contables</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Cuenta Ventas"
                    value={newConfig.cuenta_ventas_default}
                    onChange={(e) => setNewConfig({ ...newConfig, cuenta_ventas_default: e.target.value })}
                  />
                  <Input
                    placeholder="Cuenta IVA"
                    value={newConfig.cuenta_iva_trasladado}
                    onChange={(e) => setNewConfig({ ...newConfig, cuenta_iva_trasladado: e.target.value })}
                  />
                  <Input
                    placeholder="Cuenta Clientes"
                    value={newConfig.cuenta_clientes_default}
                    onChange={(e) => setNewConfig({ ...newConfig, cuenta_clientes_default: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowConfigDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveConfig}>
                  Guardar Configuración
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Export Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parámetros de Exportación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="config">Configuración</Label>
              <Select value={selectedConfig} onValueChange={setSelectedConfig}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar configuración" />
                </SelectTrigger>
                <SelectContent>
                  {configs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.nombre_configuracion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha Inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha Fin</Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={generateExportData} 
                disabled={isLoading || !selectedConfig}
                className="w-full gap-2"
              >
                <Filter className="h-4 w-4" />
                {isLoading ? 'Generando...' : 'Generar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Results */}
      {exportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Datos de Exportación ({exportData.length} asientos)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadFile('csv')} className="gap-2">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={() => downloadFile('txt')} className="gap-2">
                  <Download className="h-4 w-4" />
                  TXT
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Póliza</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Auxiliar</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Abono</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportData.slice(0, 50).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.fecha}</TableCell>
                      <TableCell className="font-mono">{row.numero_poliza}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.concepto}</TableCell>
                      <TableCell className="font-mono">{row.cuenta}</TableCell>
                      <TableCell className="font-mono">{row.auxiliar}</TableCell>
                      <TableCell className="text-right">
                        {row.cargo > 0 ? formatCurrency(row.cargo) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.abono > 0 ? formatCurrency(row.abono) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {exportData.length > 50 && (
                <div className="text-center py-4 text-muted-foreground">
                  ... y {exportData.length - 50} asientos más
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurations List */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones Guardadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa BD</TableHead>
                <TableHead>Ejercicio</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Tipo Póliza</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.nombre_configuracion}</TableCell>
                  <TableCell>{config.empresa_bd}</TableCell>
                  <TableCell>{config.ejercicio}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{config.formato_exportacion.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{config.tipo_poliza}</TableCell>
                  <TableCell>
                    <Badge variant={config.activa ? 'default' : 'secondary'}>
                      {config.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}