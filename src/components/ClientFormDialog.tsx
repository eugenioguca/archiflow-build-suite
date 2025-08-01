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
import { Loader2, MapPin } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: 'potential' | 'existing' | 'active' | 'completed';
  budget: number | null;
  notes: string | null;
  created_at: string;
  state_name?: string;
  branch_office_id?: string;
  land_square_meters?: number;
  lead_source?: 'website' | 'commercial_alliance' | 'referral' | 'social_media' | 'advertisement' | 'cold_call' | 'event' | 'partner';
  lead_referral_details?: string;
}

interface BranchOffice {
  id: string;
  name: string;
  city: string;
}

interface CommercialAlliance {
  id: string;
  name: string;
  contact_person?: string;
  active: boolean;
}

interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  onSave: () => void;
}

// Estados de México
const mexicanStates = [
  { id: "1", name: "Aguascalientes" },
  { id: "2", name: "Baja California" },
  { id: "3", name: "Baja California Sur" },
  { id: "4", name: "Campeche" },
  { id: "5", name: "Coahuila" },
  { id: "6", name: "Colima" },
  { id: "7", name: "Chiapas" },
  { id: "8", name: "Chihuahua" },
  { id: "9", name: "Ciudad de México" },
  { id: "10", name: "Durango" },
  { id: "11", name: "Guanajuato" },
  { id: "12", name: "Guerrero" },
  { id: "13", name: "Hidalgo" },
  { id: "14", name: "Jalisco" },
  { id: "15", name: "México" },
  { id: "16", name: "Michoacán" },
  { id: "17", name: "Morelos" },
  { id: "18", name: "Nayarit" },
  { id: "19", name: "Nuevo León" },
  { id: "20", name: "Oaxaca" },
  { id: "21", name: "Puebla" },
  { id: "22", name: "Querétaro" },
  { id: "23", name: "Quintana Roo" },
  { id: "24", name: "San Luis Potosí" },
  { id: "25", name: "Sinaloa" },
  { id: "26", name: "Sonora" },
  { id: "27", name: "Tabasco" },
  { id: "28", name: "Tamaulipas" },
  { id: "29", name: "Tlaxcala" },
  { id: "30", name: "Veracruz" },
  { id: "31", name: "Yucatán" },
  { id: "32", name: "Zacatecas" }
];

export function ClientFormDialog({ open, onClose, client, onSave }: ClientFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [branchOffices, setBranchOffices] = useState<BranchOffice[]>([]);
  const [commercialAlliances, setCommercialAlliances] = useState<CommercialAlliance[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    status: 'nuevo_lead' as 'nuevo_lead' | 'potential' | 'existing' | 'active' | 'completed',
    budget: '',
    notes: '',
    state_name: '',
    branch_office_id: '',
    land_square_meters: '',
    lead_source: '' as '' | 'website' | 'commercial_alliance' | 'referral' | 'social_media' | 'advertisement' | 'cold_call' | 'event' | 'partner',
    lead_referral_details: '',
    alliance_id: ''
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
        status: client.status,
        budget: client.budget?.toString() || '',
        notes: client.notes || '',
        state_name: client.state_name || '',
        branch_office_id: client.branch_office_id || '',
        land_square_meters: client.land_square_meters?.toString() || '',
        lead_source: client.lead_source || '',
        lead_referral_details: client.lead_referral_details || '',
        alliance_id: (client as any).alliance_id || ''
      });
    } else {
      // Reset form for new client
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        status: 'nuevo_lead',
        budget: '',
        notes: '',
        state_name: '',
        branch_office_id: '',
        land_square_meters: '',
        lead_source: '',
        lead_referral_details: '',
        alliance_id: ''
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
        .select('id, name, contact_person, active')
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
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        notes: formData.notes || null,
        state_name: formData.state_name || null,
        branch_office_id: formData.branch_office_id || null,
        land_square_meters: formData.land_square_meters ? parseFloat(formData.land_square_meters) : null,
        lead_source: formData.lead_source ? formData.lead_source as any : null,
        lead_referral_details: formData.lead_referral_details || null,
        alliance_id: formData.alliance_id || null,
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
        const { error } = await supabase
          .from('clients')
          .insert(clientData as any);
        
        if (error) throw error;
        
        toast({
          title: "Cliente creado",
          description: "El expediente del cliente se creó correctamente",
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {client ? 'Editar Expediente del Cliente' : 'Nuevo Expediente de Cliente'}
          </DialogTitle>
          <DialogDescription>
            {client ? 'Modifica los datos del expediente del cliente' : 'Crea un nuevo expediente de cliente con toda la información requerida'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Básica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado del Cliente</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo_lead">Nuevo Lead</SelectItem>
                    <SelectItem value="potential">Potencial</SelectItem>
                    <SelectItem value="existing">Existente</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="completed">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ubicación</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">Estado de la República *</Label>
                <Combobox
                  items={mexicanStates.map(state => ({ value: state.name, label: state.name }))}
                  value={formData.state_name || ''}
                  onValueChange={(value) => {
                    handleInputChange('state_name', value);
                  }}
                  placeholder="Buscar estado..."
                  emptyText="No se encontró el estado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_office">Sucursal Asignada</Label>
                <Select value={formData.branch_office_id} onValueChange={(value) => handleInputChange('branch_office_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOffices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name} - {office.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Dirección Completa</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Calle, número, colonia, código postal..."
                />
              </div>
            </div>
          </div>

          {/* Información del Proyecto */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información del Proyecto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="land_square_meters">Metros Cuadrados del Terreno</Label>
                <Input
                  id="land_square_meters"
                  type="number"
                  step="0.01"
                  value={formData.land_square_meters}
                  onChange={(e) => handleInputChange('land_square_meters', e.target.value)}
                  placeholder="Ej: 150.50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Presupuesto Estimado</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  placeholder="Ej: 1500000"
                />
              </div>
            </div>
          </div>

          {/* Origen del Lead */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Origen del Lead</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lead_source">¿Cómo nos conoció? *</Label>
                <Select value={formData.lead_source} onValueChange={(value) => handleInputChange('lead_source', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar origen del lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Sitio Web</SelectItem>
                    <SelectItem value="commercial_alliance">Alianza Comercial</SelectItem>
                    <SelectItem value="referral">Referido</SelectItem>
                    <SelectItem value="social_media">Redes Sociales</SelectItem>
                    <SelectItem value="advertisement">Publicidad</SelectItem>
                    <SelectItem value="cold_call">Llamada en Frío</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="partner">Socio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.lead_source === 'commercial_alliance' && (
                <div className="space-y-2">
                  <Label htmlFor="alliance_id">Alianza Comercial *</Label>
                  <Select value={formData.alliance_id} onValueChange={(value) => handleInputChange('alliance_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar alianza comercial" />
                    </SelectTrigger>
                    <SelectContent>
                      {commercialAlliances.map((alliance) => (
                        <SelectItem key={alliance.id} value={alliance.id}>
                          {alliance.name} {alliance.contact_person && `(${alliance.contact_person})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.lead_source === 'referral' && (
                <div className="space-y-2">
                  <Label htmlFor="lead_referral_details">¿Quién lo refirió?</Label>
                  <Input
                    id="lead_referral_details"
                    value={formData.lead_referral_details}
                    onChange={(e) => handleInputChange('lead_referral_details', e.target.value)}
                    placeholder="Nombre de la persona que lo refirió"
                  />
                </div>
              )}

            </div>
          </div>

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
              {client ? 'Actualizar' : 'Crear'} Expediente
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