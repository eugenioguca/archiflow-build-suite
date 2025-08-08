import React, { useState } from 'react';
import { MoreHorizontal, Eye, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserDetailsModal } from './UserDetailsModal';
import { UserDeleteDialog } from './UserDeleteDialog';
import { UserProfile, UserManagementTableProps } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function UserManagementTable({ 
  users, 
  currentUserRole, 
  onUserUpdated, 
  onUserDeleted 
}: UserManagementTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canManageUsers = currentUserRole === 'admin';

  const handleViewDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'employee':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'client':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'employee':
        return 'Empleado';
      case 'client':
        return 'Cliente';
      default:
        return role;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'pending':
        return 'Pendiente';
      case 'rejected':
        return 'Rechazado';
      default:
        return status;
    }
  };

  const formatDepartmentPosition = (department?: string, position?: string) => {
    if (!department && !position) return 'No asignado';
    
    // Formateo especial para Director General
    if (department === 'general' && position === 'director') {
      return 'Director General';
    }
    
    // Capitalizar primera letra para mejor formato
    const formatText = (text: string) => {
      return text.charAt(0).toUpperCase() + text.slice(1);
    };
    
    if (department && position) {
      return `${formatText(position)} de ${formatText(department)}`;
    }
    
    return formatText(department || position || 'No asignado');
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Departamento/Posición</TableHead>
            <TableHead>Sucursales</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No hay usuarios para mostrar
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={user.avatar_url} 
                        alt={user.full_name || 'Usuario'} 
                      />
                      <AvatarFallback className="text-xs">
                        {(user.full_name || user.email || 'U')
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {user.full_name || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {user.user_id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate">
                    {user.email || 'Sin email'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getRoleColor(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(user.approval_status)}>
                    {getStatusLabel(user.approval_status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDepartmentPosition(user.department_enum, user.position_enum)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.user_branch_assignments && user.user_branch_assignments.length > 0 ? (
                      user.user_branch_assignments.slice(0, 2).map((assignment, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {assignment.branch_offices?.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin sucursales</span>
                    )}
                    {user.user_branch_assignments && user.user_branch_assignments.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{user.user_branch_assignments.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(user)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalles
                    </Button>
                    
                    {canManageUsers && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar usuario
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <UserDetailsModal
        user={selectedUser as any}
        isOpen={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onUserUpdated={onUserUpdated}
        canManageUsers={canManageUsers}
      />

      <UserDeleteDialog
        user={userToDelete as any}
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onUserDeleted={() => {
          onUserDeleted();
          setIsDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
      />
    </div>
  );
}