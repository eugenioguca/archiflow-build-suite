import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Building2, Users } from "lucide-react";

interface ClientFormData {
  full_name: string;
  email: string;
  phone: string;
  state_id: string;
  branch_office_id: string;
  land_square_meters: number | null;
  lead_source: string;
  lead_referral_details: string;
  notes: string;
}

interface State {
  id: string;
  name: string;
  code: string;
}

interface BranchOffice {
  id: string;
  name: string;
  city: string;
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (client: any) => void;
  client?: any;
}

export function ClientFormDialog({ open, onOpenChange, onSubmit, client }: ClientFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [branchOffices, setBranchOffices] = useState<BranchOffice[]>([]);
  const [stateSearch, setStateSearch] = useState("");
  
  const [formData, setFormData] = useState<ClientFormData>({
    full_name: client?.full_name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    state_id: client?.state_id || "",
    branch_office_id: client?.branch_office_id || "",
    land_square_meters: client?.land_square_meters || null,
    lead_source: client?.lead_source || "website",
    lead_referral_details: client?.lead_referral_details || "",
    notes: client?.notes || ""
  });

  const leadSources = [
    { value: "website", label: "Sitio Web" },
    { value: "social_media", label: "Redes Sociales" },
    { value: "referral", label: "Referido" },
    { value: "advertisement", label: "Publicidad" },
    { value: "partner", label: "Alianza Comercial" },
    { value: "event", label: "Evento" }
  ];

  useEffect(() => {
    if (open) {
      fetchStates();
      fetchBranchOffices();
    }
  }, [open]);

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase
        .from("mexican_states")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setStates(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los estados",
        variant: "destructive"
      });
    }
  };

  const fetchBranchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from("branch_offices")
        .select("id, name, city")
        .eq("active", true)
        .order("name");
      
      if (error) throw error;
      setBranchOffices(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las sucursales",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: keyof ClientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Get current user profile to get the profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      const clientData = {
        ...formData,
        status: "potential" as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let result;
      if (client) {
        // Update existing client
        const { data, error } = await supabase
          .from("clients")
          .update(clientData)
          .eq("id", client.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new client
        const { data, error } = await supabase
          .from("clients")
          .insert([clientData])
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      toast({
        title: client ? "Cliente actualizado" : "Cliente creado",
        description: "La información ha sido guardada correctamente"
      });

      onSubmit(result);
      onOpenChange(false);
      
      // Reset form if creating new client
      if (!client) {
        setFormData({
          full_name: "",
          email: "",
          phone: "",
          state_id: "",
          branch_office_id: "",
          land_square_meters: null,
          lead_source: "website",
          lead_referral_details: "",
          notes: ""
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStates = states.filter(state => 
    state.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {client ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="land_square_meters">Metros Cuadrados del Terreno</Label>
              <Input
                id="land_square_meters"
                type="number"
                value={formData.land_square_meters || ""}
                onChange={(e) => handleInputChange("land_square_meters", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="ej. 300"
              />
            </div>

            <div className="space-y-2">
              <Label>Estado de la República *</Label>
              <Select 
                value={formData.state_id} 
                onValueChange={(value) => handleInputChange("state_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Buscar estado..."
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  {filteredStates.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {state.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select 
                value={formData.branch_office_id} 
                onValueChange={(value) => handleInputChange("branch_office_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branchOffices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {office.name} - {office.city}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origen del Lead *</Label>
              <Select 
                value={formData.lead_source} 
                onValueChange={(value) => handleInputChange("lead_source", value)}
              >
                <SelectTrigger>
                  <SelectValue />
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

            {formData.lead_source === "partner" && (
              <div className="space-y-2">
                <Label htmlFor="lead_referral_details">Aliado que lo refirió</Label>
                <Input
                  id="lead_referral_details"
                  value={formData.lead_referral_details}
                  onChange={(e) => handleInputChange("lead_referral_details", e.target.value)}
                  placeholder="Nombre del aliado comercial"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Información adicional sobre el cliente..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : (client ? "Actualizar" : "Crear Cliente")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}