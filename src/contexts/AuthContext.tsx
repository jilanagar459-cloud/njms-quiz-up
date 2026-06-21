import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/types';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  return data;
}

interface SendOtpResult { error: Error | null }
interface VerifyOtpResult { error: Error | null }

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<SendOtpResult>;
  verifyOtp: (phone: string, token: string) => Promise<VerifyOtpResult>;
  signInAdmin: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Pick<Profile, 'name' | 'surname' | 'tehsil'>>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) getProfile(session.user.id).then(setProfile);
      })
      .catch(error => toast.error(`Session error: ${error.message}`))
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Uses custom Edge Function which sends a real SMS via MSG91
  const sendOtp = async (phone: string): Promise<SendOtpResult> => {
    try {
      const { error } = await supabase.functions.invoke('auth-otp', {
        body: { action: 'send', phone },
        method: 'POST',
      });
      if (error) {
        const msg = await error?.context?.text?.() ?? error.message;
        throw new Error(msg);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Verifies code via Edge Function, then signs in via magic link token
  const verifyOtp = async (phone: string, token: string): Promise<VerifyOtpResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-otp', {
        body: { action: 'verify', phone, code: token },
        method: 'POST',
      });
      if (error) {
        const msg = await error?.context?.text?.() ?? error.message;
        throw new Error(msg);
      }
      if (!data?.hashed_token) throw new Error('No session token returned');

      // Sign in with the magic link token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.hashed_token,
        type: 'magiclink',
      });
      if (verifyError) throw verifyError;
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInAdmin = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateProfile = async (data: Partial<Pick<Profile, 'name' | 'surname' | 'tehsil'>>) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      const { error } = await supabase.from('profiles').update(data).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, sendOtp, verifyOtp, signInAdmin, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
