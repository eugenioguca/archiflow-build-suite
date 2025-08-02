import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { toast } from '@/hooks/use-toast';
import { Loader2, User } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  state?: string;
  profile_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface BranchOffice {
  id: string;
  name: string;
  city?: string;
}

interface CommercialAlliance {
  id: string;
  name: string;
  contact_person?: string;
}

// Estados de México
const mexicanStates = [
  { value: "aguascalientes", label: "Aguascalientes" },
  { value: "baja-california", label: "Baja California" },
  { value: "baja-california-sur", label: "Baja California Sur" },
  { value: "campeche", label: "Campeche" },
  { value: "coahuila", label: "Coahuila" },
  { value: "colima", label: "Colima" },
  { value: "chiapas", label: "Chiapas" },
  { value: "chihuahua", label: "Chihuahua" },
  { value: "ciudad-de-mexico", label: "Ciudad de México" },
  { value: "durango", label: "Durango" },
  { value: "guanajuato", label: "Guanajuato" },
  { value: "guerrero", label: "Guerrero" },
  { value: "hidalgo", label: "Hidalgo" },
  { value: "jalisco", label: "Jalisco" },
  { value: "mexico", label: "México" },
  { value: "michoacan", label: "Michoacán" },
  { value: "morelos", label: "Morelos" },
  { value: "nayarit", label: "Nayarit" },
  { value: "nuevo-leon", label: "Nuevo León" },
  { value: "oaxaca", label: "Oaxaca" },
  { value: "puebla", label: "Puebla" },
  { value: "queretaro", label: "Querétaro" },
  { value: "quintana-roo", label: "Quintana Roo" },
  { value: "san-luis-potosi", label: "San Luis Potosí" },
  { value: "sinaloa", label: "Sinaloa" },
  { value: "sonora", label: "Sonora" },
  { value: "tabasco", label: "Tabasco" },
  { value: "tamaulipas", label: "Tamaulipas" },
  { value: "tlaxcala", label: "Tlaxcala" },
  { value: "veracruz", label: "Veracruz" },
  { value: "yucatan", label: "Yucatán" },
  { value: "zacatecas", label: "Zacatecas" }
];

const leadSources = [
  { value: "website", label: "Sitio Web" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "alianzas", label: "Alianzas Comerciales" },
  { value: "referencia", label: "Referencia" },
  { value: "otro", label: "Otro" }
];

interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  onSave: () => void;
}

export function ClientFormDialog({ open, onClose, client, onSave }: ClientFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [branchOffices, setBranchOffices] = useState<BranchOffice[]>([]);
  const [commercialAlliances, setCommercialAlliances] = useState<CommercialAlliance[]>([]);
  
  const [formData, setFormData] = useState({
    // Datos del cliente
    full_name: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    notes: '',
    
    // Datos del proyecto/lead
    budget: '',
    land_square_meters: '',
    branch_office_id: '',
    lead_source: '',
    alliance_id: '',
    lead_source_details: ''
  });

  useEffect(() => {
    fetchBranchOffices();
    fetchCommercialAlliances();
  }, []);

  useEffect(() => {
    if (client) {
      setFormData({
        full_name: client.full_name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        state: client.state || '',
        notes: client.notes || '',
        budget: '',
        land_square_meters: '',
        branch_office_id: '',
        lead_source: '',
        alliance_id: '',
        lead_source_details: ''
      });
    } else {
      // Reset form for new client
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        state: '',
        notes: '',
        budget: '',
        land_square_meters: '',
        branch_office_id: '',
        lead_source: '',
        alliance_id: '',
        lead_source_details: ''
      });
    }
  }, [client, open]);

  const fetchBranchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_offices')
        .select('id, name, city')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setBranchOffices(data || []);
    } catch (error) {
      console.error('Error fetching branch offices:', error);
    }
  };

  const fetchCommercialAlliances = async () => {
    try {
      const { data, error } = await supabase
        .from('commercial_alliances')
        .select('id, name, contact_person')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCommercialAlliances(data || []);
    } catch (error) {
      console.error('Error fetching commercial alliances:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clientData = {
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        state: formData.state || null,
        notes: formData.notes || null,
      };

      if (client) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', client.id);
        
        if (error) throw error;
        
        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se actualizaron correctamente",
        });
      } else {
        // Crear cliente
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();
        
        if (clientError) throw clientError;

        // Crear proyecto automático con los nuevos datos
        const projectData = {
          client_id: newClient.id,
          project_name: `Proyecto Principal - ${formData.full_name}`,
          project_description: 'Primer proyecto del cliente',
          service_type: 'diseño',
          budget: formData.budget ? parseFloat(formData.budget) : null,
          land_square_meters: formData.land_square_meters ? parseFloat(formData.land_square_meters) : null,
          branch_office_id: formData.branch_office_id || null,
          alliance_id: formData.lead_source === 'alianzas' ? formData.alliance_id || null : null,
          lead_source: formData.lead_source || null,
          lead_source_details: formData.lead_source_details || null,
        };

        const { error: projectError } = await supabase
          .from('client_projects')
          .insert(projectData);
        
        if (projectError) throw projectError;
        
        toast({
          title: "Cliente creado",
          description: "El cliente y su proyecto inicial se crearon correctamente",
        });
      }
      
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (value: string) => {
    // Remover todo excepto números
    const numericValue = value.replace(/[^\d]/g, '');
    
    // Si está vacío, devolver vacío
    if (!numericValue) return '';
    
    // Formatear con comas
    const formatted = new Intl.NumberFormat('es-MX').format(parseInt(numericValue));
    return `$${formatted}`;
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Extraer solo números para almacenar
    const numericValue = rawValue.replace(/[^\d]/g, '');
    handleInputChange('budget', numericValue);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {client ? 'Modifica los datos básicos del cliente' : 'Crea un nuevo cliente con todos los datos del proyecto'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica del Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Básica del Cliente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Nombre completo del cliente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Ej: +52 55 1234 5678"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado de la República</Label>
                <Combobox
                  items={mexicanStates}
                  value={formData.state}
                  onValueChange={(value) => handleInputChange('state', value)}
                  placeholder="Selecciona un estado..."
                  emptyText="No se encontraron estados"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Dirección del cliente"
                />
              </div>
            </div>
          </div>

          {/* Información del Proyecto */}
          {!client && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información del Proyecto</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Presupuesto Estimado</Label>
                  <Input
                    id="budget"
                    type="text"
                    value={formatCurrency(formData.budget)}
                    onChange={handleBudgetChange}
                    placeholder="Ej: $1,500,000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="land_square_meters">Metros Cuadrados del Terreno</Label>
                  <Input
                    id="land_square_meters"
                    type="number"
                    value={formData.land_square_meters}
                    onChange={(e) => handleInputChange('land_square_meters', e.target.value)}
                    placeholder="Ej: 250"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch_office_id">Sucursal</Label>
                  <Select
                    value={formData.branch_office_id}
                    onValueChange={(value) => handleInputChange('branch_office_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una sucursal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOffices.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name} {office.city ? `- ${office.city}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead_source">Origen del Lead</Label>
                  <Select
                    value={formData.lead_source}
                    onValueChange={(value) => handleInputChange('lead_source', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el origen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.lead_source === 'alianzas' && (
                  <div className="space-y-2">
                    <Label htmlFor="alliance_id">Alianza Comercial</Label>
                    <Select
                      value={formData.alliance_id}
                      onValueChange={(value) => handleInputChange('alliance_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una alianza..." />
                      </SelectTrigger>
                      <SelectContent>
                        {commercialAlliances.map((alliance) => (
                          <SelectItem key={alliance.id} value={alliance.id}>
                            {alliance.name} {alliance.contact_person ? `- ${alliance.contact_person}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formData.lead_source === 'referencia' || formData.lead_source === 'otro' || formData.lead_source === 'alianzas') && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="lead_source_details">Detalles del Origen</Label>
                    <Input
                      id="lead_source_details"
                      value={formData.lead_source_details}
                      onChange={(e) => handleInputChange('lead_source_details', e.target.value)}
                      placeholder="Detalles adicionales sobre el origen del lead..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder="Información adicional sobre el cliente..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {client ? 'Actualizar' : 'Crear'} Cliente
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}