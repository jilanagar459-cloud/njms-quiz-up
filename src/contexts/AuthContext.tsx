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
  // `email` is the temporary delivery address while WhatsApp OTP is pending approval.
  // The phone number remains the user's real identity / profile field.
  sendOtp: (phone: string, email: string) => Promise<SendOtpResult>;
  verifyOtp: (phone: string, email: string, token: string) => Promise<VerifyOtpResult>;
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

  // ── TEMPORARY: email-delivered OTP via Supabase's own built-in mailer ──────
  // While WhatsApp template approval is pending, we collect an email address
  // purely as a delivery address (phone stays the real identity / profile
  // field). This calls Supabase Auth directly — no custom Edge Function or
  // outside email service needed. To switch back to WhatsApp later, swap
  // these two functions back to calling the `auth-otp` Edge Function (see
  // git history / WHATSAPP_SETUP.md) — nothing else in the app needs to change.
  const sendOtp = async (phone: string, email: string): Promise<SendOtpResult> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: { phone }, // stashed in user_metadata so verifyOtp can save it to the profile
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Verifies the email OTP via Supabase Auth directly, then saves the phone
  // number onto the resulting profile (profiles are auto-created by a DB
  // trigger on signup — see 00001_initial_schema.sql).
  const verifyOtp = async (phone: string, email: string, token: string): Promise<VerifyOtpResult> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user returned after verification');

      // Save phone number onto the profile (first sign-in only; safe to
      // re-run on every login since it just re-sets the same value).
      await supabase
        .from('profiles')
        .update({ phone, email })
        .eq('id', data.user.id);

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
