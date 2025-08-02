import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Building, Users, Link } from 'lucide-react';

interface BillingClient {
  id: string;
  rfc: string;
  razon_social: string;
  nombre_comercial?: string;
  regimen_fiscal: string;
  codigo_postal_fiscal: string;
  domicilio_fiscal: any;
  uso_cfdi_default: string;
  metodo_pago_default: string;
  forma_pago_default: string;
  email?: string;
  telefono?: string;
  contacto_principal?: string;
  notas?: string;
  activo: boolean;
  client_id?: string;
  project_id?: string;
  created_at: string;
}

interface SalesClient {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
  clients: SalesClient;
}

const REGIMEN_FISCAL_OPTIONS = [
  { value: '601', label: 'General de Ley Personas Morales' },
  { value: '603', label: 'Personas Morales con Fines no Lucrativos' },
  { value: '605', label: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { value: '606', label: 'Arrendamiento' },
  { value: '607', label: 'Régimen de Enajenación o Adquisición de Bienes' },
  { value: '608', label: 'Demás ingresos' },
  { value: '610', label: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { value: '611', label: 'Ingresos por Dividendos (socios y accionistas)' },
  { value: '612', label: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { value: '614', label: 'Ingresos por intereses' },
  { value: '615', label: 'Régimen de los ingresos por obtención de premios' },
  { value: '616', label: 'Sin obligaciones fiscales' },
  { value: '620', label: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { value: '621', label: 'Incorporación Fiscal' },
  { value: '622', label: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { value: '623', label: 'Opcional para Grupos de Sociedades' },
  { value: '624', label: 'Coordinados' },
  { value: '625', label: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { value: '626', label: 'Régimen Simplificado de Confianza' }
];

const USO_CFDI_OPTIONS = [
  { value: 'G01', label: 'Adquisición de mercancías' },
  { value: 'G02', label: 'Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'Gastos en general' },
  { value: 'I01', label: 'Construcciones' },
  { value: 'I02', label: 'Mobilario y equipo de oficina por inversiones' },
  { value: 'I03', label: 'Equipo de transporte' },
  { value: 'I04', label: 'Equipo de computo y accesorios' },
  { value: 'I05', label: 'Dados, troqueles, moldes, matrices y herramental' },
  { value: 'I06', label: 'Comunicaciones telefónicas' },
  { value: 'I07', label: 'Comunicaciones satelitales' },
  { value: 'I08', label: 'Otra maquinaria y equipo' },
  { value: 'D01', label: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'D02', label: 'Gastos médicos por incapacidad o discapacidad' },
  { value: 'D03', label: 'Gastos funerales' },
  { value: 'D04', label: 'Donativos' },
  { value: 'D05', label: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
  { value: 'D06', label: 'Aportaciones voluntarias al SAR' },
  { value: 'D07', label: 'Primas por seguros de gastos médicos' },
  { value: 'D08', label: 'Gastos de transportación escolar obligatoria' },
  { value: 'D09', label: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { value: 'D10', label: 'Pagos por servicios educativos (colegiaturas)' },
  { value: 'P01', label: 'Por definir' },
  { value: 'S01', label: 'Sin efectos fiscales' },
  { value: 'CP01', label: 'Pagos' },
  { value: 'CN01', label: 'Nómina' }
];

export function BillingClientsManager() {
  const [billingClients, setBillingClients] = useState<BillingClient[]>([]);
  const [salesClients, setSalesClients] = useState<SalesClient[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<BillingClient | null>(null);
  const [formData, setFormData] = useState({
    rfc: '',
    razon_social: '',
    nombre_comercial: '',
    regimen_fiscal: '',
    codigo_postal_fiscal: '',
    domicilio_fiscal: {
      calle: '',
      numero_exterior: '',
      numero_interior: '',
      colonia: '',
      localidad: '',
      municipio: '',
      estado: '',
      pais: 'México'
    },
    uso_cfdi_default: 'G03',
    metodo_pago_default: 'PUE',
    forma_pago_default: '99',
    email: '',
    telefono: '',
    contacto_principal: '',
    notas: '',
    client_id: '',
    project_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch billing clients
      const { data: billingData, error: billingError } = await supabase
        .from('billing_clients')
        .select('*')
        .order('razon_social');

      if (billingError) throw billingError;
      setBillingClients(billingData || []);

      // Fetch sales clients
      const { data: salesData, error: salesError } = await supabase
        .from('clients')
        .select('id, full_name, email, phone')
        .order('full_name');

      if (salesError) throw salesError;
      setSalesClients(salesData || []);

      // Fetch projects with client info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          client_id,
          clients!inner(id, full_name, email, phone)
        `)
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error('Usuario no autenticado');

      const billingClientData = {
        ...formData,
        client_id: formData.client_id || null,
        project_id: formData.project_id || null,
        created_by: currentUser.data.user.id
      };

      if (editingClient) {
        const { error } = await supabase
          .from('billing_clients')
          .update(billingClientData)
          .eq('id', editingClient.id);

        if (error) throw error;
        toast({ title: "Éxito", description: "Cliente de facturación actualizado correctamente" });
      } else {
        const { error } = await supabase
          .from('billing_clients')
          .insert(billingClientData);

        if (error) throw error;
        toast({ title: "Éxito", description: "Cliente de facturación creado correctamente" });
      }

      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente de facturación",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (client: BillingClient) => {
    setEditingClient(client);
    setFormData({
      rfc: client.rfc,
      razon_social: client.razon_social,
      nombre_comercial: client.nombre_comercial || '',
      regimen_fiscal: client.regimen_fiscal,
      codigo_postal_fiscal: client.codigo_postal_fiscal,
      domicilio_fiscal: client.domicilio_fiscal || {
        calle: '',
        numero_exterior: '',
        numero_interior: '',
        colonia: '',
        localidad: '',
        municipio: '',
        estado: '',
        pais: 'México'
      },
      uso_cfdi_default: client.uso_cfdi_default,
      metodo_pago_default: client.metodo_pago_default,
      forma_pago_default: client.forma_pago_default,
      email: client.email || '',
      telefono: client.telefono || '',
      contacto_principal: client.contacto_principal || '',
      notas: client.notas || '',
      client_id: client.client_id || '',
      project_id: client.project_id || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente de facturación?')) return;

    try {
      const { error } = await supabase
        .from('billing_clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Éxito", description: "Cliente de facturación eliminado correctamente" });
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente de facturación",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      rfc: '',
      razon_social: '',
      nombre_comercial: '',
      regimen_fiscal: '',
      codigo_postal_fiscal: '',
      domicilio_fiscal: {
        calle: '',
        numero_exterior: '',
        numero_interior: '',
        colonia: '',
        localidad: '',
        municipio: '',
        estado: '',
        pais: 'México'
      },
      uso_cfdi_default: 'G03',
      metodo_pago_default: 'PUE',
      forma_pago_default: '99',
      email: '',
      telefono: '',
      contacto_principal: '',
      notas: '',
      client_id: '',
      project_id: ''
    });
  };

  const importFromSalesClient = (clientId: string) => {
    const client = salesClients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        razon_social: client.full_name,
        nombre_comercial: client.full_name,
        email: client.email || '',
        telefono: client.phone || '',
        contacto_principal: client.full_name,
        client_id: clientId
      }));
    }
  };

  const filteredClients = billingClients.filter(client =>
    client.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.nombre_comercial && client.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="flex justify-center p-8">Cargando clientes de facturación...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Clientes de Facturación</h2>
          <p className="text-muted-foreground">
            Gestiona los clientes específicos para facturación electrónica
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente Facturación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente de Facturación' : 'Nuevo Cliente de Facturación'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Import Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <Link className="h-4 w-4 mr-2" />
                    Vincular con datos existentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Cliente de ventas</label>
                      <Select
                        value={formData.client_id || 'none'}
                        onValueChange={(value) => {
                          const actualValue = value === 'none' ? '' : value;
                          setFormData(prev => ({ ...prev, client_id: actualValue }));
                          if (actualValue) importFromSalesClient(actualValue);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente de ventas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin vincular</SelectItem>
                          {salesClients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Proyecto</label>
                      <Select
                        value={formData.project_id || 'none'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proyecto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin vincular</SelectItem>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name} - {project.clients.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <Building className="h-4 w-4 mr-2" />
                    Información Fiscal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">RFC *</label>
                      <Input
                        value={formData.rfc}
                        onChange={(e) => setFormData(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                        placeholder="XAXX010101000"
                        required
                        maxLength={13}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Código Postal Fiscal *</label>
                      <Input
                        value={formData.codigo_postal_fiscal}
                        onChange={(e) => setFormData(prev => ({ ...prev, codigo_postal_fiscal: e.target.value }))}
                        placeholder="12345"
                        required
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Razón Social *</label>
                    <Input
                      value={formData.razon_social}
                      onChange={(e) => setFormData(prev => ({ ...prev, razon_social: e.target.value }))}
                      placeholder="Razón social completa"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Nombre Comercial</label>
                    <Input
                      value={formData.nombre_comercial}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre_comercial: e.target.value }))}
                      placeholder="Nombre comercial"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Régimen Fiscal *</label>
                    <Select
                      value={formData.regimen_fiscal}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, regimen_fiscal: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar régimen fiscal" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIMEN_FISCAL_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.value} - {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Domicilio Fiscal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Calle</label>
                      <Input
                        value={formData.domicilio_fiscal.calle}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          domicilio_fiscal: { ...prev.domicilio_fiscal, calle: e.target.value }
                        }))}
                        placeholder="Nombre de la calle"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Número Exterior</label>
                      <Input
                        value={formData.domicilio_fiscal.numero_exterior}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          domicilio_fiscal: { ...prev.domicilio_fiscal, numero_exterior: e.target.value }
                        }))}
                        placeholder="123"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Número Interior</label>
                      <Input
                        value={formData.domicilio_fiscal.numero_interior}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          domicilio_fiscal: { ...prev.domicilio_fiscal, numero_interior: e.target.value }
                        }))}
                        placeholder="A"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Colonia</label>
                      <Input
                        value={formData.domicilio_fiscal.colonia}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          domicilio_fiscal: { ...prev.domicilio_fiscal, colonia: e.target.value }
                        }))}
                        placeholder="Colonia"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Municipio</label>
                      <Input
                        value={formData.domicilio_fiscal.municipio}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          domicilio_fiscal: { ...prev.domicilio_fiscal, municipio: e.target.value }
                        }))}
                        placeholder="Municipio"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Estado</label>
                      <Input
                        value={formData.domicilio_fiscal.estado}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          domicilio_fiscal: { ...prev.domicilio_fiscal, estado: e.target.value }
                        }))}
                        placeholder="Estado"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">País</label>
                      <Input
                        value={formData.domicilio_fiscal.pais}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          domicilio_fiscal: { ...prev.domicilio_fiscal, pais: e.target.value }
                        }))}
                        placeholder="México"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CFDI Defaults */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Configuración CFDI por Defecto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Uso de CFDI</label>
                      <Select
                        value={formData.uso_cfdi_default}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, uso_cfdi_default: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USO_CFDI_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.value} - {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Método de Pago</label>
                      <Select
                        value={formData.metodo_pago_default}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, metodo_pago_default: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PUE">PUE - Pago en una sola exhibición</SelectItem>
                          <SelectItem value="PPD">PPD - Pago en parcialidades o diferido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Forma de Pago</label>
                      <Select
                        value={formData.forma_pago_default}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, forma_pago_default: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">01 - Efectivo</SelectItem>
                          <SelectItem value="02">02 - Cheque nominativo</SelectItem>
                          <SelectItem value="03">03 - Transferencia electrónica de fondos</SelectItem>
                          <SelectItem value="04">04 - Tarjeta de crédito</SelectItem>
                          <SelectItem value="28">28 - Tarjeta de débito</SelectItem>
                          <SelectItem value="99">99 - Por definir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    Información de Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Teléfono</label>
                      <Input
                        value={formData.telefono}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                        placeholder="+52 555 123 4567"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Contacto Principal</label>
                    <Input
                      value={formData.contacto_principal}
                      onChange={(e) => setFormData(prev => ({ ...prev, contacto_principal: e.target.value }))}
                      placeholder="Nombre del contacto principal"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Notas</label>
                    <Textarea
                      value={formData.notas}
                      onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                      placeholder="Notas adicionales sobre el cliente"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingClient ? 'Actualizar' : 'Crear'} Cliente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por razón social, RFC o nombre comercial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFC</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>Régimen Fiscal</TableHead>
                <TableHead>Uso CFDI</TableHead>
                <TableHead>Vinculación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-mono">{client.rfc}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.razon_social}</div>
                      {client.nombre_comercial && (
                        <div className="text-sm text-muted-foreground">{client.nombre_comercial}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{client.regimen_fiscal}</TableCell>
                  <TableCell>{client.uso_cfdi_default}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {client.client_id && (
                        <Badge variant="secondary" className="text-xs">
                          Cliente Ventas
                        </Badge>
                      )}
                      {client.project_id && (
                        <Badge variant="outline" className="text-xs">
                          Proyecto
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.activo ? 'default' : 'secondary'}>
                      {client.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredClients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron clientes de facturación
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}