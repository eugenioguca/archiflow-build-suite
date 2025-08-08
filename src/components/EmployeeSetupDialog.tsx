import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: 'admin' | 'employee' | 'client';
  approval_status: string;
  department_enum?: string;
  position_enum?: string;
}

interface BranchOffice {
  id: string;
  name: string;
  active: boolean;
}

interface EmployeeSetupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onUserUpdated: () => void;
}

const departmentOptions = [
  { value: 'general', label: 'General' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'diseño', label: 'Diseño' },
  { value: 'construcción', label: 'Construcción' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'contabilidad', label: 'Contabilidad' },
];

const positionOptions = [
  { value: 'director', label: 'Director' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'jefatura', label: 'Jefatura' },
  { value: 'analista', label: 'Analista' },
  { value: 'auxiliar', label: 'Auxiliar' },
];

export function EmployeeSetupDialog({ isOpen, onOpenChange, user, onUserUpdated }: EmployeeSetupDialogProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchOffices, setBranchOffices] = useState<BranchOffice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchBranchOffices();
      if (user) {
        setSelectedDepartment(user.department_enum || '');
        setSelectedPosition(user.position_enum || '');
        fetchUserBranches();
      }
    }
  }, [isOpen, user]);

  const fetchBranchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_offices')
        .select('id, name, active')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setBranchOffices(data || []);
    } catch (error) {
      console.error('Error fetching branch offices:', error);
    }
  };

  const fetchUserBranches = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_branch_assignments')
        .select('branch_office_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setSelectedBranches(data?.map(item => item.branch_office_id) || []);
    } catch (error) {
      console.error('Error fetching user branches:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedDepartment || !selectedPosition) {
      toast({
        title: "Error",
        description: "Por favor selecciona departamento y cargo",
        variant: "destructive",
      });
      return;
    }

    // Validate branch selection for non-directors (except finance/accounting)
    if (selectedPosition !== 'director' && 
        !['finanzas', 'contabilidad'].includes(selectedDepartment) && 
        selectedBranches.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos una sucursal",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update user profile with department and position
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          department_enum: selectedDepartment as any,
          position_enum: selectedPosition as any,
          role: 'employee',
          approval_status: 'approved'
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Clear existing branch assignments
      await supabase
        .from('user_branch_assignments')
        .delete()
        .eq('user_id', user.id);

      // Add new branch assignments (only if not director and not finance/accounting)
      if (selectedPosition !== 'director' && 
          !['finanzas', 'contabilidad'].includes(selectedDepartment) && 
          selectedBranches.length > 0) {
        
        const branchAssignments = selectedBranches.map(branchId => ({
          user_id: user.id,
          branch_office_id: branchId,
        }));

        const { error: branchError } = await supabase
          .from('user_branch_assignments')
          .insert(branchAssignments);

        if (branchError) throw branchError;
      }

      toast({
        title: "Usuario configurado",
        description: "El usuario ha sido configurado exitosamente",
      });

      onUserUpdated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error setting up employee:', error);
      toast({
        title: "Error",
        description: "Error al configurar el usuario",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedDepartment('');
    setSelectedPosition('');
    setSelectedBranches([]);
  };

  const shouldShowBranches = selectedPosition !== 'director' && 
                            selectedPosition !== '' && 
                            !['finanzas', 'contabilidad'].includes(selectedDepartment);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Empleado</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="user-info">Usuario</Label>
            <div className="text-sm text-muted-foreground">
              {user?.full_name || user?.email || 'Sin nombre'}
            </div>
          </div>

          <div>
            <Label htmlFor="department">Departamento</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar departamento" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="position">Cargo</Label>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cargo" />
              </SelectTrigger>
              <SelectContent>
                {positionOptions.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {shouldShowBranches && (
            <div>
              <Label>Sucursales Asignadas</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {branchOffices.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={branch.id}
                      checked={selectedBranches.includes(branch.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBranches([...selectedBranches, branch.id]);
                        } else {
                          setSelectedBranches(selectedBranches.filter(id => id !== branch.id));
                        }
                      }}
                    />
                    <Label htmlFor={branch.id} className="text-sm">
                      {branch.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Configurar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}