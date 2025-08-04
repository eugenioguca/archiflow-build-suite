import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Edit3, 
  Settings, 
  MapPin, 
  Phone, 
  Mail, 
  Building,
  Shield,
  User,
  UserCheck,
  UserX,
  MoreHorizontal,
  Eye
} from 'lucide-react';

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
  created_at: string;
  user_branch_assignments?: Array<{
    branch_office_id: string;
    branch_offices: { name: string };
  }>;
}

interface UserCardProps {
  user: UserProfile;
  onEdit: (user: UserProfile) => void;
  onSetupEmployee: (user: UserProfile) => void;
  onApprovalChange: (userId: string, approved: boolean) => void;
  onRoleChange: (userId: string, role: 'admin' | 'employee' | 'client') => void;
  canManage: boolean;
  isCompact?: boolean;
}

const roleLabels = {
  admin: 'Administrador',
  employee: 'Empleado',
  client: 'Cliente'
};

const roleColors = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  employee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  client: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
};

const departmentLabels = {
  ventas: 'Ventas',
  diseño: 'Diseño',
  construcción: 'Construcción',
  finanzas: 'Finanzas',
  contabilidad: 'Contabilidad'
};

const positionLabels = {
  director: 'Director',
  gerente: 'Gerente',
  jefatura: 'Jefatura',
  analista: 'Analista',
  auxiliar: 'Auxiliar'
};

export function UserCard({ 
  user, 
  onEdit, 
  onSetupEmployee, 
  onApprovalChange, 
  onRoleChange,
  canManage 
}: UserCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isApproved = user.approval_status === 'approved';
  const hasEmployeeSetup = user.department_enum && user.position_enum;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {user.full_name || 'Sin nombre'}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            <Badge className={`text-xs ${roleColors[user.role]}`}>
              {roleLabels[user.role]}
            </Badge>
            {user.approval_status === 'approved' ? (
              <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                <UserCheck className="w-3 h-3 mr-1" />
                Aprobado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                <UserX className="w-3 h-3 mr-1" />
                Pendiente
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Información básica siempre visible */}
        <div className="space-y-2">
          {user.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{user.phone}</span>
            </div>
          )}
          
          {user.role === 'employee' && hasEmployeeSetup && (
            <>
              <div className="flex items-center text-sm">
                <Building className="w-4 h-4 mr-2 flex-shrink-0 text-primary" />
                <span className="font-medium">
                  {departmentLabels[user.department_enum as keyof typeof departmentLabels]} - {' '}
                  {positionLabels[user.position_enum as keyof typeof positionLabels]}
                </span>
              </div>
              
              {user.user_branch_assignments && user.user_branch_assignments.length > 0 && (
                <div className="flex items-start text-sm">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {user.user_branch_assignments.slice(0, isExpanded ? undefined : 2).map((assignment, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {assignment.branch_offices.name}
                      </Badge>
                    ))}
                    {!isExpanded && user.user_branch_assignments.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.user_branch_assignments.length - 2} más
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Información expandida */}
        {isExpanded && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Creado: {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </CardContent>

      {canManage && (
        <CardFooter className="pt-0">
          <div className="flex flex-col gap-2 w-full">
            {/* Botón principal de editar */}
            <Button
              size="sm"
              onClick={() => onEdit(user)}
              className="w-full"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Editar Usuario
            </Button>
            
            {/* Botones secundarios */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-1" />
                {isExpanded ? 'Menos' : 'Ver más'}
              </Button>
              
              {user.approval_status !== 'approved' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApprovalChange(user.user_id, true)}
                  className="flex-1"
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Aprobar
                </Button>
              )}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}