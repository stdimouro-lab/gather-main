import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import { claimTabInvitesForUser } from "@/lib/tabShares";

const AuthContext = createContext(null);

async function ensureProfile(user) {
  if (!user?.id) return;

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.fullName ||
    "";

  const email = user.email || "";

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("ensureProfile error:", error);
    throw error;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("getSession error:", error);
      }

      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
    } catch (err) {
      console.error("getSession threw:", err);
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;
        if (error) console.error("getSession error:", error);

        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      } catch (err) {
        if (!isMounted) return;
        console.error("getSession threw:", err);
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSession();

    const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, newSession) => {
  if (!isMounted) return;

  setSession(newSession ?? null);
  setUser(newSession?.user ?? null);
  setLoading(false);

  if (newSession?.user?.id) {
    setTimeout(() => {
      ensureProfile(newSession.user).catch((e) => {
        console.error("Profile bootstrap failed:", e);
      });
    }, 0);
  }
});

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
  if (!user?.id || !user?.email || !session) return;

  claimTabInvitesForUser({ userId: user.id, email: user.email }).catch((e) => {
    console.error("Failed to claim tab invites:", e);
  });
}, [user?.id, user?.email, session]);

  const signIn = async ({ email, password }) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const signUp = async ({ fullName, email, password }) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    });
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  const sendPasswordReset = async (email) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const updatePassword = async (password) => {
    return await supabase.auth.updateUser({ password });
  };

  const value = useMemo(() => {
    const emailConfirmed = !!user?.email_confirmed_at || !!user?.confirmed_at;

    return {
      user,
      session,
      loading,
      isAuthed: !!session?.user,
      emailConfirmed,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshSession,
      ensureProfile: () => ensureProfile(user),
    };
  }, [user, session, loading, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}