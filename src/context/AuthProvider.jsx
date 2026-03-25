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
    user.user_metadata?.name ||
    "";

  const email = user.email || "";

  // First check whether a profile already exists so we do not overwrite
  // a good saved name with an empty OAuth value later.
  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("ensureProfile read error:", readError);
    throw readError;
  }

  const payload = {
    id: user.id,
    email: email || existingProfile?.email || "",
    updated_at: new Date().toISOString(),
  };

  // Only write full_name if we actually have one,
  // or if the profile does not already have one.
  if (fullName) {
    payload.full_name = fullName;
  } else if (!existingProfile?.full_name) {
    payload.full_name = "";
  }

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("ensureProfile upsert error:", error);
    throw error;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((newSession) => {
    setSession(newSession ?? null);
    setUser(newSession?.user ?? null);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("refreshSession getSession error:", error);
      }

      applySession(data?.session ?? null);
    } catch (err) {
      console.error("refreshSession threw:", err);
      applySession(null);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("initial getSession error:", error);
        }

        applySession(data?.session ?? null);

        if (data?.session?.user?.id) {
          ensureProfile(data.session.user).catch((e) => {
            console.error("Initial profile bootstrap failed:", e);
          });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("initial getSession threw:", err);
        applySession(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      applySession(newSession ?? null);
      setLoading(false);

      if (
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED") &&
        newSession?.user?.id
      ) {
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
  }, [applySession]);

  useEffect(() => {
    if (!user?.id || !user?.email || !session) return;

    claimTabInvitesForUser({
      userId: user.id,
      email: user.email,
    }).catch((e) => {
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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/calendar`,
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