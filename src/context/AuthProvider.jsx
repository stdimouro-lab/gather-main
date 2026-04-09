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

function timeoutPromise(ms, label) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
}

async function withTimeout(promise, ms, label) {
  return Promise.race([promise, timeoutPromise(ms, label)]);
}

async function ensureProfile(user) {
  if (!user?.id) return null;

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.fullName ||
    user.user_metadata?.name ||
    "";

  const email = user.email || "";

  const { data: existingProfile, error: readError } = await withTimeout(
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    8000,
    "profiles read"
  );

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

  const { error: upsertError } = await withTimeout(
    supabase.from("profiles").upsert(payload, {
      onConflict: "id",
    }),
    8000,
    "profiles upsert"
  );

  if (upsertError) {
    console.error("ensureProfile upsert error:", upsertError);
    throw upsertError;
  }

  const { data: profile, error: profileError } = await withTimeout(
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    8000,
    "profiles fetch"
  );

  if (profileError) {
    console.error("ensureProfile fetch error:", profileError);
    throw profileError;
  }

  return profile ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const bootstrappedRef = useRef(false);
  const claimedInviteKeyRef = useRef(null);
  const profilePromiseRef = useRef(null);
  const mountedRef = useRef(false);

  const safeSet = useCallback((fn) => {
    if (mountedRef.current) fn();
  }, []);

  const applySession = useCallback(
    (newSession) => {
      safeSet(() => {
        setSession(newSession ?? null);
        setUser(newSession?.user ?? null);
      });
    },
    [safeSet]
  );

  const clearProfileState = useCallback(() => {
    safeSet(() => {
      setProfile(null);
      setProfileLoading(false);
    });
  }, [safeSet]);

  const clearAuthState = useCallback(() => {
    claimedInviteKeyRef.current = null;
    profilePromiseRef.current = null;

    safeSet(() => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      setProfileLoading(false);
    });
  }, [safeSet]);

  const loadProfile = useCallback(
    async (activeUser) => {
      if (!activeUser?.id) {
        claimedInviteKeyRef.current = null;
        profilePromiseRef.current = null;
        clearProfileState();
        return null;
      }

      if (profilePromiseRef.current) {
        return profilePromiseRef.current;
      }

      safeSet(() => setProfileLoading(true));
      console.log("loadProfile start", activeUser.id);

      const promise = (async () => {
        try {
          const ensured = await withTimeout(
            ensureProfile(activeUser),
            10000,
            "ensureProfile"
          );

          console.log("loadProfile ensured profile");

          try {
            await withTimeout(
              ensureAccountForUser(activeUser),
              10000,
              "ensureAccountForUser"
            );
          } catch (accountError) {
            console.error("ensureAccountForUser failed:", accountError);
          }

          safeSet(() => {
            setProfile(ensured ?? null);
          });

          return ensured ?? null;
        } catch (err) {
          console.error("loadProfile error:", err);
          safeSet(() => {
            setProfile(null);
          });
          return null;
        } finally {
          profilePromiseRef.current = null;
          safeSet(() => {
            setProfileLoading(false);
          });
        }
      })();

      profilePromiseRef.current = promise;
      return promise;
    },
    [clearProfileState, safeSet]
  );

  const hydrateFromSession = useCallback(
    async (newSession) => {
      applySession(newSession);

      if (!newSession?.user) {
        claimedInviteKeyRef.current = null;
        profilePromiseRef.current = null;
        clearProfileState();
        safeSet(() => setLoading(false));
        return null;
      }

      await loadProfile(newSession.user);
      safeSet(() => setLoading(false));
      return newSession;
    },
    [applySession, clearProfileState, loadProfile, safeSet]
  );

  const refreshSession = useCallback(async () => {
    safeSet(() => {
      setLoading(true);
      setProfileLoading(true);
    });

    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        "auth.getSession"
      );

      if (error) {
        console.error("refreshSession getSession error:", error);
        throw error;
      }

      return await hydrateFromSession(data?.session ?? null);
    } catch (err) {
      console.error("refreshSession threw:", err);
      clearAuthState();
      return null;
    }
  }, [clearAuthState, hydrateFromSession, safeSet]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      clearProfileState();
      return null;
    }

    safeSet(() => setProfileLoading(true));

    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        8000,
        "refreshProfile"
      );

      if (error) throw error;

      safeSet(() => {
        setProfile(data ?? null);
      });

      return data ?? null;
    } catch (err) {
      console.error("refreshProfile error:", err);
      safeSet(() => {
        setProfile(null);
      });
      return null;
    } finally {
      safeSet(() => setProfileLoading(false));
    }
  }, [clearProfileState, safeSet, user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let watchdogId = null;

    const startWatchdog = () => {
      watchdogId = window.setTimeout(() => {
        console.error("Auth bootstrap watchdog fired; forcing loading false");
        safeSet(() => {
          setLoading(false);
          setProfileLoading(false);
        });
      }, 12000);
    };

    const stopWatchdog = () => {
      if (watchdogId) {
        clearTimeout(watchdogId);
        watchdogId = null;
      }
    };

    const bootstrap = async () => {
      startWatchdog();

      safeSet(() => {
        setLoading(true);
        setProfileLoading(true);
      });

      try {
        console.log("AuthProvider bootstrap start");

        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          "initial auth.getSession"
        );

        if (error) {
          console.error("initial getSession error:", error);
          throw error;
        }

        const newSession = data?.session ?? null;
        console.log("AuthProvider bootstrap session:", !!newSession?.user);

        await hydrateFromSession(newSession);
      } catch (err) {
        console.error("initial getSession threw:", err);
        clearAuthState();
      } finally {
        stopWatchdog();
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("onAuthStateChange", event, !!newSession?.user);

      safeSet(() => setLoading(true));

      try {
        await hydrateFromSession(newSession ?? null);
      } catch (err) {
        console.error("onAuthStateChange hydrate error:", err);
        clearAuthState();
      }
    });

    return () => {
      stopWatchdog();
      subscription?.unsubscribe();
    };
  }, [clearAuthState, hydrateFromSession, safeSet]);

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
  }, [
    user,
    session,
    profile,
    loading,
    profileLoading,
    refreshSession,
    refreshProfile,
  ]);

  console.log("AuthProvider state", {
    path: typeof window !== "undefined" ? window.location.pathname : "",
    loading,
    profileLoading,
    hasUser: !!user,
    hasSession: !!session,
    hasProfile: !!profile,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}