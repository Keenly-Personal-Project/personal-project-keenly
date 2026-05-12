import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Demo bypass user for preview mode
const BYPASS_USER: User = {
  id: 'demo-bypass-user-0000',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'demo@keenly.preview',
  app_metadata: {},
  user_metadata: { full_name: 'Preview Editor' },
  created_at: new Date().toISOString(),
} as User;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isBypass: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  activateBypass: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBypass, setIsBypass] = useState(() => localStorage.getItem('keen_bypass_mode') === 'true');

  useEffect(() => {
    if (isBypass) {
      setUser(BYPASS_USER);
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadingFallback = window.setTimeout(() => {
      if (!mounted) return;
      setSession(null);
      setUser(null);
      setLoading(false);
    }, 8000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        window.clearTimeout(loadingFallback);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        window.clearTimeout(loadingFallback);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        window.clearTimeout(loadingFallback);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
      window.clearTimeout(loadingFallback);
      subscription.unsubscribe();
    };
  }, [isBypass]);

  const activateBypass = () => {
    localStorage.setItem('keen_bypass_mode', 'true');
    setIsBypass(true);
    setUser(BYPASS_USER);
    setLoading(false);
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (isBypass) {
      localStorage.removeItem('keen_bypass_mode');
      setIsBypass(false);
      setUser(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isBypass, signUp, signIn, signOut, activateBypass }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
