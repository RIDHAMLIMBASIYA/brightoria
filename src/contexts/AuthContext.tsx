import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
}

type ProfileExtras = {
  phone?: string;
  schoolCollege?: string;
  strongSubject?: string;
  weakSubject?: string;
  hobbies?: string[];
  university?: string;
  subject?: string;
  experienceYears?: number;
  qualification?: string;
};

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: 'student' | 'teacher' | 'admin',
    extras?: ProfileExtras
  ) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string, email: string, metadata?: any) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // If profile doesn't exist yet, create it from auth metadata (safe due to RLS)
      if (!profile && metadata) {
        const toTextArray = (v: any) => {
          if (!v) return null;
          if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
          if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
          return null;
        };

        await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            name: metadata?.name || email,
            avatar_url: metadata?.avatar_url,
            phone: metadata?.phone,
            school_college: metadata?.school_college,
            strong_subject: metadata?.strong_subject,
            weak_subject: metadata?.weak_subject,
            hobbies: toTextArray(metadata?.hobbies),
            university: metadata?.university,
            subject: metadata?.subject,
            experience_years: typeof metadata?.experience_years === 'number' ? metadata.experience_years : undefined,
            qualification: metadata?.qualification,
          });
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        setUser({
          id: userId,
          name: profile.name || email,
          email: email,
          role: (roleData?.role as 'student' | 'teacher' | 'admin') || 'student',
          avatar: profile.avatar_url || undefined,
        });
      } else {
        // Profile not created yet, set basic user
        setUser({
          id: userId,
          name: email.split('@')[0],
          email: email,
          role: (roleData?.role as 'student' | 'teacher' | 'admin') || 'student',
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(() => {
            fetchUserProfile(session.user.id, session.user.email || '', session.user.user_metadata);
          }, 0);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email || '', session.user.user_metadata);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const refreshUser = async () => {
    const userId = session?.user?.id;
    const email = session?.user?.email || '';
    if (!userId) return;
    await fetchUserProfile(userId, email, session?.user?.user_metadata);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'student' | 'teacher' | 'admin',
    extras?: ProfileExtras
  ) => {
    setIsLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;

    const payload = {
      name,
      role,
      ...(extras?.phone ? { phone: extras.phone } : {}),
      ...(extras?.schoolCollege ? { school_college: extras.schoolCollege } : {}),
      ...(extras?.strongSubject ? { strong_subject: extras.strongSubject } : {}),
      ...(extras?.weakSubject ? { weak_subject: extras.weakSubject } : {}),
      ...(extras?.hobbies?.length ? { hobbies: extras.hobbies } : {}),
      ...(extras?.university ? { university: extras.university } : {}),
      ...(extras?.subject ? { subject: extras.subject } : {}),
      ...(typeof extras?.experienceYears === 'number' ? { experience_years: extras.experienceYears } : {}),
      ...(extras?.qualification ? { qualification: extras.qualification } : {}),
    };
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          ...payload,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      login,
      register,
      logout,
      isAuthenticated: !!session,
      refreshUser,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
