import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import { claimTabInvitesForUser } from "@/lib/tabShares";
import { ensureAccountForUser } from "@/lib/account";

const AuthContext = createContext(null);

async function ensureProfile(user) {
  if (!user?.id) return null;

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.fullName ||
    user.user_metadata?.name ||
    "";

  const email = user.email || "";

  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("*")
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

  if (fullName && !existingProfile?.full_name) {
    payload.full_name = fullName;
  }

  if (!existingProfile?.display_name && fullName) {
    payload.display_name = fullName;
  }

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("ensureProfile upsert error:", error);
    throw error;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("ensureProfile fetch error:", profileError);
    throw profileError;
  }

  return profile;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
const [session, setSession] = useState(null);
const [profile, setProfile] = useState(null);
const [loading, setLoading] = useState(true);
const [profileLoading, setProfileLoading] = useState(true);
const claimedInviteKeyRef = useRef(null);

  const applySession = useCallback((newSession) => {
    setSession(newSession ?? null);
    setUser(newSession?.user ?? null);
  }, []);

  const loadProfile = useCallback(async (activeUser) => {
    if (!activeUser?.id) {
  claimedInviteKeyRef.current = null;
  setProfile(null);
  setProfileLoading(false);
  return null;
}

    setProfileLoading(true);

    try {
  const ensured = await ensureProfile(activeUser);
  await ensureAccountForUser(activeUser);
  setProfile(ensured ?? null);
  return ensured ?? null;
} catch (err) {
      console.error("loadProfile error:", err);
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("refreshSession getSession error:", error);
      }

      const newSession = data?.session ?? null;
      applySession(newSession);

      if (newSession?.user) {
  const sameUser = newSession.user.id === user?.id;

  // If we already have a profile for the same user, do not block the app
  // on token refresh / focus-related auth events.
  if (!sameUser || !profile) {
    await loadProfile(newSession.user);
  }
} else {
  claimedInviteKeyRef.current = null;
  setProfile(null);
  setProfileLoading(false);
}
    } catch (err) {
      console.error("refreshSession threw:", err);
      applySession(null);
      setProfile(null);
      setProfileLoading(false);
    } finally {
      setLoading(false);
    }
  }, [applySession, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return null;
    }

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      return data;
    } catch (err) {
      console.error("refreshProfile error:", err);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
  let isMounted = true;

  const bootstrap = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error("initial getSession error:", error);
      }

      const newSession = data?.session ?? null;
      applySession(newSession);

      if (newSession?.user) {
        await loadProfile(newSession.user);
      } else {
        claimedInviteKeyRef.current = null;
        setProfile(null);
        setProfileLoading(false);
      }
    } catch (err) {
      if (!isMounted) return;
      console.error("initial getSession threw:", err);
      applySession(null);
      claimedInviteKeyRef.current = null;
      setProfile(null);
      setProfileLoading(false);
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  bootstrap();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (!isMounted) return;

    const nextUser = newSession?.user ?? null;
    const currentUserId = user?.id ?? null;
    const nextUserId = nextUser?.id ?? null;
    const userChanged = currentUserId !== nextUserId;

    applySession(newSession ?? null);
    setLoading(false);

    if (!nextUser) {
      claimedInviteKeyRef.current = null;
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    // Only reload profile when the signed-in user actually changes
    // or we do not have one yet.
    if (userChanged || !profile) {
      await loadProfile(nextUser);
    }
  });

  return () => {
    isMounted = false;
    subscription?.unsubscribe();
  };
}, [applySession, loadProfile, user?.id, profile]);

  useEffect(() => {
  if (!user?.id || !user?.email || !session) return;

  const claimKey = `${user.id}:${user.email.toLowerCase().trim()}`;
  if (claimedInviteKeyRef.current === claimKey) return;

  claimedInviteKeyRef.current = claimKey;

  claimTabInvitesForUser({
    userId: user.id,
    email: user.email,
  }).catch((e) => {
    console.error("Failed to claim tab invites:", e);
    claimedInviteKeyRef.current = null;
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
      profile,
      loading,
      profileLoading,
      isAuthed: !!session?.user,
      emailConfirmed,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshSession,
      refreshProfile,
    };
  }, [user, session, profile, loading, profileLoading, refreshSession, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}