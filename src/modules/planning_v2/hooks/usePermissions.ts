/**
 * usePermissions Hook - Planning v2
 * 
 * Check and manage Planning v2 permissions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as permissionsService from '../services/permissionsService';
import type { PlanningV2Role } from '../types';

export function usePermissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check specific role
  const checkRole = async (role: PlanningV2Role) => {
    try {
      return await permissionsService.checkUserRole(role);
    } catch (error) {
      console.error('Error verificando rol:', error);
      return false;
    }
  };

  // Check viewer access
  const isViewerQuery = useQuery({
    queryKey: ['planning-v2-role', 'viewer'],
    queryFn: permissionsService.checkViewerAccess,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  // Check editor access
  const isEditorQuery = useQuery({
    queryKey: ['planning-v2-role', 'editor'],
    queryFn: permissionsService.checkEditorAccess,
    staleTime: 5 * 60 * 1000
  });

  // Check publisher access
  const isPublisherQuery = useQuery({
    queryKey: ['planning-v2-role', 'publisher'],
    queryFn: permissionsService.checkPublisherAccess,
    staleTime: 5 * 60 * 1000
  });

  // Get all user roles
  const allRolesQuery = useQuery({
    queryKey: ['planning-v2-all-roles'],
    queryFn: permissionsService.getAllUserRoles,
    enabled: isPublisherQuery.data === true // Solo si es publisher
  });

  // Grant role mutation
  const grantRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
      expiresAt,
      notes
    }: {
      userId: string;
      role: PlanningV2Role;
      expiresAt?: Date;
      notes?: string;
    }) => permissionsService.grantRole(userId, role, expiresAt, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-v2-all-roles'] });
      toast({
        title: 'Rol asignado',
        description: 'El rol se ha asignado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo asignar el rol: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Revoke role mutation
  const revokeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: PlanningV2Role }) =>
      permissionsService.revokeRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-v2-all-roles'] });
      toast({
        title: 'Rol revocado',
        description: 'El rol se ha revocado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo revocar el rol: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  return {
    // Queries
    isViewer: isViewerQuery.data || false,
    isEditor: isEditorQuery.data || false,
    isPublisher: isPublisherQuery.data || false,
    allRoles: allRolesQuery.data,
    
    // Loading states
    isLoadingPermissions: 
      isViewerQuery.isLoading || 
      isEditorQuery.isLoading || 
      isPublisherQuery.isLoading,
    
    // Functions
    checkRole,
    grantRole: grantRoleMutation.mutateAsync,
    revokeRole: revokeRoleMutation.mutateAsync,
    
    // Mutation states
    isGranting: grantRoleMutation.isPending,
    isRevoking: revokeRoleMutation.isPending
  };
}
