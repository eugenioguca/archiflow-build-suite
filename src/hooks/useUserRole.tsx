import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserProfile {
  role: 'admin' | 'employee' | 'client';
  department_enum?: string;
  position_enum?: string;
}

interface UserRoleHook {
  profile: UserProfile | null;
  isAdmin: boolean;
  isEmployee: boolean;
  isClient: boolean;
  isDirector: boolean;
  isGeneralDirector: boolean;
  canManageUsers: boolean;
  isLoading: boolean;
}

export const useUserRole = (): UserRoleHook => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, department_enum, position_enum')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        setProfile(data as UserProfile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  const isAdmin = profile?.role === 'admin';
  const isEmployee = profile?.role === 'employee';
  const isClient = profile?.role === 'client';
  const isDirector = profile?.position_enum === 'director';
  const isGeneralDirector = isDirector && profile?.department_enum === 'general';
  
  // Can manage users if admin or general director
  const canManageUsers = isAdmin || isGeneralDirector;

  return {
    profile,
    isAdmin,
    isEmployee,
    isClient,
    isDirector,
    isGeneralDirector,
    canManageUsers,
    isLoading,
  };
};