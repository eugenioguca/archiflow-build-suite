import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectFormData {
  name: string;
  description: string;
  location: string;
  assigned_team: string[];
  phases: {
    name: string;
    value: number;
  }[];
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormData) => void;
}

const defaultPhases = [
  { name: "Diseño", value: 15 },
  { name: "Permisos", value: 10 },
  { name: "Cimientos", value: 20 },
  { name: "Estructura", value: 25 },
  { name: "Instalaciones", value: 15 },
  { name: "Acabados", value: 15 }
];

export function ProjectFormDialog({ open, onOpenChange, onSubmit }: ProjectFormDialogProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    location: "",
    assigned_team: [""],
    phases: defaultPhases
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: "",
      description: "",
      location: "",
      assigned_team: [""],
      phases: defaultPhases
    });
    onOpenChange(false);
  };

  const addTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      assigned_team: [...prev.assigned_team, ""]
    }));
  };

  const updateTeamMember = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_team: prev.assigned_team.map((member, i) => i === index ? value : member)
    }));
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      assigned_team: prev.assigned_team.filter((_, i) => i !== index)
    }));
  };

  const addPhase = () => {
    setFormData(prev => ({
      ...prev,
      phases: [...prev.phases, { name: "", value: 10 }]
    }));
  };

  const updatePhase = (index: number, field: 'name' | 'value', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map((phase, i) => 
        i === index ? { ...phase, [field]: value } : phase
      )
    }));
  };

  const removePhase = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre del Proyecto</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div>
            <Label>Equipo Asignado</Label>
            <div className="space-y-2">
              {formData.assigned_team.map((member, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={member}
                    onChange={(e) => updateTeamMember(index, e.target.value)}
                    placeholder="Nombre del miembro del equipo"
                  />
                  {formData.assigned_team.length > 1 && (
                    <Button type="button" variant="outline" onClick={() => removeTeamMember(index)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addTeamMember}>
                Agregar Miembro
              </Button>
            </div>
          </div>

          <div>
            <Label>Fases del Proyecto</Label>
            <div className="space-y-2">
              {formData.phases.map((phase, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={phase.name}
                    onChange={(e) => updatePhase(index, 'name', e.target.value)}
                    placeholder="Nombre de la fase"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={phase.value}
                    onChange={(e) => updatePhase(index, 'value', parseInt(e.target.value) || 0)}
                    placeholder="Puntos"
                    className="w-24"
                    min="1"
                    max="100"
                  />
                  <Button type="button" variant="outline" onClick={() => removePhase(index)}>
                    Eliminar
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addPhase}>
                Agregar Fase
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Proyecto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}