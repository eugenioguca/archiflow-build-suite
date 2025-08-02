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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only check approval for authenticated users
        if (session?.user) {
          console.log('Checking approval for user:', session.user.id);
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('approval_status, role, full_name, position, department, phone, profile_completed')
              .eq('user_id', session.user.id)
              .single();
            
            console.log('User profile:', profile);
            console.log('Profile error:', profileError);
            
            // Admins are automatically approved
            const isAdmin = profile?.role === 'admin';
            const isApprovedUser = profile?.approval_status === 'approved';
            const shouldBeApproved = isAdmin || isApprovedUser;
            
            // Check if profile is complete (need all required fields)
            const profileComplete = profile?.profile_completed === true ||
              (profile?.full_name && profile?.position && profile?.department && profile?.phone);
            
            console.log('Is admin:', isAdmin);
            console.log('Is approved user:', isApprovedUser);
            console.log('Should be approved:', shouldBeApproved);
            console.log('Profile complete:', profileComplete);
            
            setProfile(profile);
            setIsApproved(shouldBeApproved);
            setNeedsOnboarding(!profileComplete && shouldBeApproved);
          } catch (error) {
            console.error('Error checking approval status:', error);
            setIsApproved(false);
          }
        } else {
          setIsApproved(false);
          setNeedsOnboarding(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        // Always update session and user state on auth change
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth callback
          setTimeout(async () => {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('approval_status, role, full_name, position, department, phone, profile_completed')
                .eq('user_id', session.user.id)
                .single();
              
              console.log('Auth listener - User profile:', profile);
              console.log('Auth listener - Profile error:', profileError);
              
              // Admins are automatically approved
              const isAdmin = profile?.role === 'admin';
              const isApprovedUser = profile?.approval_status === 'approved';
              const shouldBeApproved = isAdmin || isApprovedUser;
              
              // Check if profile is complete
              const profileComplete = profile?.profile_completed === true ||
                (profile?.full_name && profile?.position && profile?.department && profile?.phone);
              
              console.log('Auth listener - Should be approved:', shouldBeApproved);
              console.log('Auth listener - Profile complete:', profileComplete);
              
              // Only update state if values actually changed
              setProfile(prevProfile => {
                if (JSON.stringify(prevProfile) !== JSON.stringify(profile)) {
                  return profile;
                }
                return prevProfile;
              });
              
              setIsApproved(prevApproved => {
                if (prevApproved !== shouldBeApproved) {
                  return shouldBeApproved;
                }
                return prevApproved;
              });
              
              setNeedsOnboarding(prevOnboarding => {
                const newOnboarding = !profileComplete && shouldBeApproved;
                if (prevOnboarding !== newOnboarding) {
                  return newOnboarding;
                }
                return prevOnboarding;
              });
            } catch (error) {
              console.error('Error checking approval status in listener:', error);
              setIsApproved(false);
            }
          }, 100); // Increased timeout to reduce race conditions
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
    console.log('Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      console.log('Successfully signed out');
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