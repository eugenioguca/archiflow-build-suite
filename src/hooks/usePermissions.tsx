import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserPermissions {
  hasModuleAccess: (module: string) => boolean;
  userBranches: string[];
  canViewAllBranches: boolean;
  isLoading: boolean;
}

export const usePermissions = (): UserPermissions => {
  const { user } = useAuth();
  const [userBranches, setUserBranches] = useState<string[]>([]);
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean>>({});
  const [canViewAllBranches, setCanViewAllBranches] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Get user branches
        const { data: branchData } = await supabase.rpc('get_user_branch_offices', {
          _user_id: user.id
        });

        if (branchData) {
          setUserBranches(branchData);
        }

        // Get user profile to check permissions
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, department_enum, position_enum')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          // Check if user can view all branches
          if (profile.role === 'admin' || 
              profile.position_enum === 'director' || 
              ['finanzas', 'contabilidad'].includes(profile.department_enum as string)) {
            setCanViewAllBranches(true);
          }

          // Get module permissions
          const modules = ['dashboard', 'calendar', 'clients', 'sales', 'design', 'construction', 'suppliers', 'finances', 'accounting', 'client_portal_preview', 'tools'];
          const permissions: Record<string, boolean> = {};

          for (const module of modules) {
            const { data: hasAccess } = await supabase.rpc('has_module_permission', {
              _user_id: user.id,
              _module: module
            });
            permissions[module] = hasAccess || false;
          }

          setModulePermissions(permissions);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.id]);

  const hasModuleAccess = (module: string): boolean => {
    // Calendar should be accessible to all authenticated users
    if (module === 'calendar') return true;
    return modulePermissions[module] || false;
  };

  return {
    hasModuleAccess,
    userBranches,
    canViewAllBranches,
    isLoading,
  };
};