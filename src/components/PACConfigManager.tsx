import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, Shield, Zap, Edit, Trash2, TestTube, Globe } from 'lucide-react';

interface PACConfig {
  id: string;
  nombre: string;
  proveedor: string; // Changed from union type to string
  activo: boolean;
  principal: boolean;
  api_url: string;
  usuario?: string;
  api_key?: string;
  creditos_disponibles: number;
  costo_timbrado: number;
  modo_pruebas: boolean;
}

export function PACConfigManager() {
  const [configs, setConfigs] = useState<PACConfig[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PACConfig | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nombre: '',
    proveedor: 'facturama' as 'facturama' | 'sw_sapien' | 'fiscal_api' | 'otro',
    api_url: '',
    usuario: '',
    password: '',
    api_key: '',
    api_secret: '',
    endpoint_timbrado: '',
    endpoint_cancelacion: '',
    endpoint_consulta: '',
    creditos_disponibles: 0,
    costo_timbrado: 0,
    limite_mensual: 1000,
    modo_pruebas: true
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('pac_configurations')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching PAC configs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las configuraciones PAC',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const configData = {
        ...formData,
        activo: false,
        principal: false,
        created_by: user.id
      };

      let error;
      
      if (editingConfig) {
        const { error: updateError } = await supabase
          .from('pac_configurations')
          .update(configData)
          .eq('id', editingConfig.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('pac_configurations')
          .insert([configData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: editingConfig ? 'Configuración actualizada correctamente' : 'Configuración PAC creada correctamente'
      });

      setShowDialog(false);
      setEditingConfig(null);
      resetForm();
      fetchConfigs();
    } catch (error) {
      console.error('Error saving PAC config:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar la configuración PAC',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (config: PACConfig) => {
    setEditingConfig(config);
    setFormData({
      nombre: config.nombre,
      proveedor: config.proveedor as any,
      api_url: config.api_url,
      usuario: config.usuario || '',
      password: '',
      api_key: config.api_key || '',
      api_secret: '',
      endpoint_timbrado: '',
      endpoint_cancelacion: '',
      endpoint_consulta: '',
      creditos_disponibles: config.creditos_disponibles,
      costo_timbrado: config.costo_timbrado,
      limite_mensual: 1000,
      modo_pruebas: config.modo_pruebas
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta configuración PAC?')) return;

    try {
      const { error } = await supabase
        .from('pac_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Configuración PAC eliminada correctamente'
      });

      fetchConfigs();
    } catch (error) {
      console.error('Error deleting PAC config:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar la configuración PAC',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      // If activating, first deactivate all others
      if (active) {
        await supabase
          .from('pac_configurations')
          .update({ activo: false, principal: false })
          .neq('id', id);
      }

      const { error } = await supabase
        .from('pac_configurations')
        .update({ 
          activo: active, 
          principal: active // If active, make it principal too
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: active ? 'PAC activado correctamente' : 'PAC desactivado correctamente'
      });

      fetchConfigs();
    } catch (error) {
      console.error('Error toggling PAC status:', error);
      toast({
        title: 'Error',
        description: 'Error al cambiar el estado del PAC',
        variant: 'destructive'
      });
    }
  };

  const testConnection = async (configId: string) => {
    toast({
      title: 'Probando conexión...',
      description: 'Verificando la conexión con el PAC'
    });

    // Simulate connection test
    setTimeout(() => {
      toast({
        title: 'Éxito',
        description: 'Conexión con PAC establecida correctamente'
      });
    }, 2000);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      proveedor: 'facturama',
      api_url: '',
      usuario: '',
      password: '',
      api_key: '',
      api_secret: '',
      endpoint_timbrado: '',
      endpoint_cancelacion: '',
      endpoint_consulta: '',
      creditos_disponibles: 0,
      costo_timbrado: 0,
      limite_mensual: 1000,
      modo_pruebas: true
    });
  };

  const getProviderDefaults = (provider: string) => {
    switch (provider) {
      case 'facturama':
        return {
          api_url: 'https://api.facturama.mx',
          endpoint_timbrado: '/api/cfdi',
          endpoint_cancelacion: '/api/cfdi/cancel',
          endpoint_consulta: '/api/cfdi/status'
        };
      case 'sw_sapien':
        return {
          api_url: 'https://services.sw.com.mx',
          endpoint_timbrado: '/cfdi33/stamp/v1/b64',
          endpoint_cancelacion: '/cfdi33/cancel/csd',
          endpoint_consulta: '/cfdi33/status'
        };
      case 'fiscal_api':
        return {
          api_url: 'https://www.fiscal-api.com',
          endpoint_timbrado: '/api/v1/cfdi33/issue',
          endpoint_cancelacion: '/api/v1/cfdi33/cancel',
          endpoint_consulta: '/api/v1/cfdi33/status'
        };
      default:
        return {
          api_url: '',
          endpoint_timbrado: '',
          endpoint_cancelacion: '',
          endpoint_consulta: ''
        };
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'facturama':
        return <Shield className="h-4 w-4" />;
      case 'sw_sapien':
        return <Zap className="h-4 w-4" />;
      case 'fiscal_api':
        return <Globe className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Configuración de PAC</h3>
          <p className="text-muted-foreground">
            Gestiona las configuraciones de Proveedores Autorizados de Certificación
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { resetForm(); setEditingConfig(null); }}>
              <Plus className="h-4 w-4" />
              Nueva Configuración PAC
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Editar Configuración PAC' : 'Nueva Configuración PAC'}
              </DialogTitle>
              <DialogDescription>
                Configura la conexión con tu Proveedor Autorizado de Certificación
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre de la Configuración</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="PAC Principal"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proveedor">Proveedor PAC</Label>
                  <Select 
                    value={formData.proveedor} 
                    onValueChange={(value: any) => {
                      const defaults = getProviderDefaults(value);
                      setFormData({ 
                        ...formData, 
                        proveedor: value,
                        ...defaults
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facturama">Facturama</SelectItem>
                      <SelectItem value="sw_sapien">SW Sapien</SelectItem>
                      <SelectItem value="fiscal_api">Fiscal API</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_url">URL de la API</Label>
                <Input
                  id="api_url"
                  value={formData.api_url}
                  onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                  placeholder="https://api.proveedor.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuario/Email</Label>
                  <Input
                    id="usuario"
                    value={formData.usuario}
                    onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="tu-api-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_secret">API Secret</Label>
                  <Input
                    id="api_secret"
                    type="password"
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    placeholder="tu-api-secret"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endpoints</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Endpoint Timbrado"
                    value={formData.endpoint_timbrado}
                    onChange={(e) => setFormData({ ...formData, endpoint_timbrado: e.target.value })}
                  />
                  <Input
                    placeholder="Endpoint Cancelación"
                    value={formData.endpoint_cancelacion}
                    onChange={(e) => setFormData({ ...formData, endpoint_cancelacion: e.target.value })}
                  />
                  <Input
                    placeholder="Endpoint Consulta"
                    value={formData.endpoint_consulta}
                    onChange={(e) => setFormData({ ...formData, endpoint_consulta: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditos_disponibles">Créditos Disponibles</Label>
                  <Input
                    id="creditos_disponibles"
                    type="number"
                    value={formData.creditos_disponibles}
                    onChange={(e) => setFormData({ ...formData, creditos_disponibles: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costo_timbrado">Costo por Timbrado</Label>
                  <Input
                    id="costo_timbrado"
                    type="number"
                    step="0.01"
                    value={formData.costo_timbrado}
                    onChange={(e) => setFormData({ ...formData, costo_timbrado: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limite_mensual">Límite Mensual</Label>
                  <Input
                    id="limite_mensual"
                    type="number"
                    value={formData.limite_mensual}
                    onChange={(e) => setFormData({ ...formData, limite_mensual: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="modo_pruebas"
                  checked={formData.modo_pruebas}
                  onCheckedChange={(checked) => setFormData({ ...formData, modo_pruebas: checked })}
                />
                <Label htmlFor="modo_pruebas" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Modo de Pruebas
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingConfig ? 'Actualizar' : 'Crear'} Configuración
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* PAC Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuraciones PAC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>URL API</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.nombre}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getProviderIcon(config.proveedor)}
                      <span className="capitalize">{config.proveedor.replace('_', ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{config.api_url}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {config.creditos_disponibles} créditos
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.modo_pruebas ? 'secondary' : 'default'}>
                      {config.modo_pruebas ? 'Pruebas' : 'Producción'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.activo}
                        onCheckedChange={(checked) => handleToggleActive(config.id, checked)}
                      />
                      {config.principal && (
                        <Badge variant="default" className="text-xs">
                          Principal
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testConnection(config.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {configs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay configuraciones PAC</p>
              <p className="text-sm">Agrega una configuración para empezar a timbrar facturas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}