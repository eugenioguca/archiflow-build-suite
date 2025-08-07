import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
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
    notes: ''
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
        notes: client.notes || ''
      });
    } else {
      // Reset form for new client
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
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
    console.log('DEBUG: Starting client save process...');
    console.log('DEBUG: Form data:', formData);
    console.log('DEBUG: Is editing?', !!client);
    setLoading(true);

    try {
      const clientData = {
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        notes: formData.notes || null
      };

      console.log('DEBUG: Client data to save:', clientData);

      if (client) {
        console.log('DEBUG: Updating existing client with ID:', client.id);
        const { data, error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', client.id)
          .select();
        
        console.log('DEBUG: Update result:', { data, error });
        if (error) throw error;
        
        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se actualizaron correctamente",
        });
      } else {
        console.log('DEBUG: Creating new client...');
        const { data, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select();
        
        console.log('DEBUG: Insert result:', { data, error });
        if (error) throw error;
        
        toast({
          title: "Cliente creado",
          description: "El expediente del cliente se creó correctamente",
        });
      }
      
      console.log('DEBUG: Client save completed successfully');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('ERROR: Client save failed:', error);
      console.error('ERROR: Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {client ? 'Editar Expediente del Cliente' : 'Nuevo Expediente de Cliente'}
          </DialogTitle>
          <DialogDescription>
            {client ? 'Modifica los datos del expediente del cliente' : 'Crea un nuevo expediente de cliente con toda la información requerida'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col max-h-[calc(85vh-120px)]">
          <ScrollArea className="flex-1 pr-4">
            <form onSubmit={handleSubmit} className="space-y-6 pb-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica del Cliente</h3>
              
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
            </form>
          </ScrollArea>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" className="flex-1" disabled={loading} onClick={handleSubmit}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {client ? 'Actualizar' : 'Crear'} Expediente
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}