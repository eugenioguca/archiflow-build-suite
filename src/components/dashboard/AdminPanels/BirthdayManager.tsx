import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Cake, Save, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  full_name: string;
  birth_date: string | null;
  email: string;
}

interface BirthdayManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBirthdaysUpdated: () => void;
}

export function BirthdayManager({ open, onOpenChange, onBirthdaysUpdated }: BirthdayManagerProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date, email')
        .eq('role', 'employee')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBirthDate = async (employeeId: string, birthDate: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ birth_date: birthDate || null })
        .eq('id', employeeId);

      if (error) throw error;

      setEmployees(prev => 
        prev.map(emp => 
          emp.id === employeeId 
            ? { ...emp, birth_date: birthDate || null }
            : emp
        )
      );
    } catch (error) {
      console.error('Error updating birth date:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de cumpleaños",
        variant: "destructive"
      });
    }
  };

  const saveAllChanges = async () => {
    setSaving(true);
    try {
      // The updates are already saved individually, so just refresh
      onBirthdaysUpdated();
      toast({
        title: "Éxito",
        description: "Fechas de cumpleaños actualizadas correctamente"
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Error al guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink" />
            Gestionar Fechas de Cumpleaños
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Employee List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No se encontraron empleados' : 'No hay empleados registrados'}
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-pink to-purple text-white">
                      {getInitials(employee.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{employee.full_name}</p>
                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                  </div>
                  
                  <div className="w-40">
                    <Label htmlFor={`birth-${employee.id}`} className="sr-only">
                      Fecha de cumpleaños
                    </Label>
                    <Input
                      id={`birth-${employee.id}`}
                      type="date"
                      value={employee.birth_date || ''}
                      onChange={(e) => updateBirthDate(employee.id, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cerrar
            </Button>
            <Button
              onClick={saveAllChanges}
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}