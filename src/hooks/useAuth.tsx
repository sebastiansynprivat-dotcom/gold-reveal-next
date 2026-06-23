import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { group_name?: string; name?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const visitTracked = useRef(false);

  const trackVisit = (userId: string) => {
    if (visitTracked.current) return;
    visitTracked.current = true;
    supabase.from('login_events').insert({ user_id: userId }).then();
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only clear the user on EXPLICIT sign-out. Supabase can briefly emit
      // null sessions on TOKEN_REFRESHED races / transient network blips, and
      // those would otherwise kick the user back to /auth and wipe context.
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (session) {
        setSession(session);
        setUser(session.user ?? null);
        if (session.user) trackVisit(session.user.id);
      } else if (event === "INITIAL_SESSION") {
        // Genuinely no session at startup – go to login.
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        trackVisit(session.user.id);
      }

      // If we have a session, proactively refresh it so an expired/near-expired
      // token doesn't silently cause queries to return empty data later.
      if (session) {
        supabase.auth.refreshSession().catch(() => {
          // ignore – we'll keep the existing session in state
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const signUp = async (email: string, password: string, metadata?: { group_name?: string; name?: string }) => {
    const { error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: metadata ? { data: metadata } : undefined,
    });
    if (!error) {
      // Force the homescreen tutorial to (re)appear on the first dashboard visit
      try {
        localStorage.removeItem("homescreen_tutorial_seen");
        localStorage.setItem("force_homescreen_tutorial", "1");
      } catch {}
    }
    return { error };
  };


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
