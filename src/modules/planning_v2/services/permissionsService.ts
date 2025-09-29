/**
 * Permissions Service - Planning v2
 * 
 * Manage Planning v2 specific roles and permissions
 */

import { supabase } from '@/integrations/supabase/client';
import type { PlanningV2UserRole, PlanningV2Role } from '../types';
import { PLANNING_V2_ENABLED } from '../config/featureFlag';

// ==================== Role Check ====================

export async function checkUserRole(role: PlanningV2Role): Promise<boolean> {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .rpc('has_planning_v2_role', {
      _user_id: user.id,
      _role: role
    });

  if (error) throw error;
  return data || false;
}

export async function checkViewerAccess(): Promise<boolean> {
  return checkUserRole('viewer');
}

export async function checkEditorAccess(): Promise<boolean> {
  return checkUserRole('editor');
}

export async function checkPublisherAccess(): Promise<boolean> {
  return checkUserRole('publisher');
}

// ==================== Role Management ====================

export async function getUserRoles(userId: string) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { data, error } = await supabase
    .from('planning_v2_user_roles')
    .select(`
      *,
      granted_by_profile:profiles!planning_v2_user_roles_granted_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data as unknown as PlanningV2UserRole[];
}

export async function grantRole(
  userId: string,
  role: PlanningV2Role,
  expiresAt?: Date,
  notes?: string
) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  // Verificar que el usuario actual tiene permisos
  const canManage = await checkPublisherAccess();
  if (!canManage) {
    throw new Error('No tienes permisos para asignar roles de Planning v2');
  }

  // Obtener profile_id del usuario que otorga el rol
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data: grantedByProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('planning_v2_user_roles')
    .upsert({
      user_id: userId,
      role,
      granted_by: grantedByProfile?.id,
      expires_at: expiresAt?.toISOString(),
      notes
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PlanningV2UserRole;
}

export async function revokeRole(userId: string, role: PlanningV2Role) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const canManage = await checkPublisherAccess();
  if (!canManage) {
    throw new Error('No tienes permisos para revocar roles de Planning v2');
  }

  const { error } = await supabase
    .from('planning_v2_user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) throw error;
}

export async function getAllUserRoles() {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { data, error } = await supabase
    .from('planning_v2_user_roles')
    .select(`
      *,
      user_profile:profiles!planning_v2_user_roles_user_id_fkey(
        id,
        full_name,
        email,
        user_id
      ),
      granted_by_profile:profiles!planning_v2_user_roles_granted_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .order('granted_at', { ascending: false });

  if (error) throw error;
  return data as unknown as (PlanningV2UserRole & {
    user_profile: any;
    granted_by_profile: any;
  })[];
}
