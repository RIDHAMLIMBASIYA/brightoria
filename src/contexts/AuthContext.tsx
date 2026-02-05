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
  /** Teacher accounts must be approved by an admin before accessing the app. */
  teacherApprovalStatus: 'unknown' | 'pending' | 'approved';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherApprovalStatus, setTeacherApprovalStatus] = useState<'unknown' | 'pending' | 'approved'>('unknown');

  const ensureTeacherApprovalRecord = async (userId: string) => {
    // Teachers can insert their own pending approval; admins can manage all.
    const { data: existing, error: existingErr } = await supabase
      .from('teacher_approvals')
      .select('user_id, approved')
      .eq('user_id', userId)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing) return existing;

    const { data: inserted, error: insertErr } = await supabase
      .from('teacher_approvals')
      .insert({
        user_id: userId,
        approved: false,
        approved_at: null,
        approved_by: null,
      })
      .select('user_id, approved')
      .maybeSingle();
    if (insertErr) throw insertErr;
    return inserted ?? { user_id: userId, approved: false };
  };

  const fetchUserProfile = async (
    userId: string,
    email: string,
    metadata?: any,
  ): Promise<{ blocked: boolean }> => {
    try {
      setTeacherApprovalStatus('unknown');

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

      const role = (roleData?.role as 'student' | 'teacher' | 'admin') || 'student';

      // Teacher approval gating: teachers must be approved to remain signed in.
      if (role === 'teacher') {
        const approval = await ensureTeacherApprovalRecord(userId);
        if (!approval?.approved) {
          setTeacherApprovalStatus('pending');
          // Sign out immediately to block access.
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          return { blocked: true };
        }
        setTeacherApprovalStatus('approved');
      } else {
        setTeacherApprovalStatus('approved');
      }

      if (profile) {
        setUser({
          id: userId,
          name: profile.name || email,
          email: email,
          role,
          avatar: profile.avatar_url || undefined,
        });
      } else {
        // Profile not created yet, set basic user
        setUser({
          id: userId,
          name: email.split('@')[0],
          email: email,
          role,
        });
      }

      return { blocked: false };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { blocked: false };
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Keep loading=true until the user profile is hydrated.
          // Defer Supabase calls to avoid auth callback deadlocks.
          setIsLoading(true);
          setTimeout(() => {
            fetchUserProfile(session.user.id, session.user.email || '', session.user.user_metadata)
              .catch((err) => console.error('Error hydrating user profile:', err))
              .finally(() => setIsLoading(false));
          }, 0);
        } else {
          setUser(null);
          setTeacherApprovalStatus('unknown');
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        setIsLoading(true);
        fetchUserProfile(session.user.id, session.user.email || '', session.user.user_metadata)
          .catch((err) => console.error('Error hydrating user profile:', err))
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
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
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }

    // Immediately gate teacher accounts (avoid brief navigation to protected pages).
    const userId = data.user?.id;
    const userEmail = data.user?.email || email;
    if (userId) {
      const { blocked } = await fetchUserProfile(userId, userEmail, data.user?.user_metadata);
      if (blocked) {
        setIsLoading(false);
        throw new Error('Your teacher account is pending admin approval.');
      }
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
    setTeacherApprovalStatus('unknown');
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
      teacherApprovalStatus,
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
