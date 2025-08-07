import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  isApproved: boolean;
  needsOnboarding: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true); // Cambiado a true para evitar flash inicial
  const [isApproved, setIsApproved] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Check for existing session first
    const initializeAuth = async () => {
      console.log('DEBUG: Initializing auth...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('DEBUG: Session obtained:', !!session, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only check approval for authenticated users
        if (session?.user) {
          console.log('DEBUG: Checking approval for user:', session.user.id);
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('approval_status, role, full_name, position_enum, department_enum, phone, profile_completed')
              .eq('user_id', session.user.id)
              .single();
            
            console.log('DEBUG: User profile:', profile);
            console.log('DEBUG: Profile error:', profileError);
            
            // Admins are automatically approved
            const isAdmin = profile?.role === 'admin';
            const isApprovedUser = profile?.approval_status === 'approved';
            const shouldBeApproved = isAdmin || isApprovedUser;
            
            console.log('DEBUG: Approval status:', { isAdmin, isApprovedUser, shouldBeApproved });
            
            // Check if profile is complete based on role
            const isClient = profile?.role === 'client';
            const profileComplete = profile?.profile_completed === true ||
              (isClient 
                ? (profile?.full_name && profile?.phone) // Para clientes solo nombre y teléfono
                : (profile?.full_name && profile?.position_enum && profile?.department_enum && profile?.phone) // Para empleados todos los campos
              );
            
            console.log('DEBUG: Profile completion:', { isClient, profileComplete });
            
            setProfile(profile);
            setIsApproved(shouldBeApproved);
            setNeedsOnboarding(!profileComplete && shouldBeApproved);
            
            console.log('DEBUG: Final auth state:', { 
              approved: shouldBeApproved, 
              needsOnboarding: !profileComplete && shouldBeApproved 
            });
          } catch (error) {
            console.error('ERROR: Error checking approval status:', error);
            setIsApproved(false);
          }
        } else {
          console.log('DEBUG: No authenticated user');
          setIsApproved(false);
          setNeedsOnboarding(false);
        }
      } catch (error) {
        console.error('ERROR: Error initializing auth:', error);
      } finally {
        console.log('DEBUG: Auth initialization completed');
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth callback
          setTimeout(async () => {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('approval_status, role, full_name, position_enum, department_enum, phone, profile_completed')
                .eq('user_id', session.user.id)
                .single();
              
              
              // Admins are automatically approved
              const isAdmin = profile?.role === 'admin';
              const isApprovedUser = profile?.approval_status === 'approved';
              const shouldBeApproved = isAdmin || isApprovedUser;
              
              // Check if profile is complete based on role
              const isClient = profile?.role === 'client';
              const profileComplete = profile?.profile_completed === true ||
                (isClient 
                  ? (profile?.full_name && profile?.phone) // Para clientes solo nombre y teléfono
                  : (profile?.full_name && profile?.position_enum && profile?.department_enum && profile?.phone) // Para empleados todos los campos
                );
              
              setProfile(profile);
              setIsApproved(shouldBeApproved);
              setNeedsOnboarding(!profileComplete && shouldBeApproved);
            } catch (error) {
              console.error('Error checking approval status in listener:', error);
              setIsApproved(false);
            }
          }, 0);
        } else {
          setIsApproved(false);
          setNeedsOnboarding(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    profile,
    signIn,
    signUp,
    signOut,
    loading,
    isApproved,
    needsOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}