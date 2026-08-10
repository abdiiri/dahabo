import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { STAFF_ROLE_LABELS, type StaffRole } from "@/lib/api/types";

export type AuthProfile = {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  roleLabel: string;
  jobTitle: string | null;
  staffCode: string | null;
  status: string;
  mustChangePassword: boolean;
};

type AuthContextValue = {
  /** True while we're still checking for an existing session or loading the profile. */
  loading: boolean;
  user: User | null;
  profile: AuthProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Re-fetches the current user's profile row (e.g. after changing password). */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export { initials as personaInitials };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  // Not configured -> nothing to wait for, so start "not loading".
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // Track the session.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Once we have an authenticated user, load their profile row. This is the
  // ONLY place persona info comes from — never hard-coded.
  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;
    setLoading(true);

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) {
          const role = (data.role ?? "staff") as StaffRole;
          setProfile({
            id: data.id,
            fullName: data.full_name ?? data.email,
            email: data.email,
            role,
            roleLabel: STAFF_ROLE_LABELS[role] ?? role,
            jobTitle: data.job_title ?? null,
            staffCode: data.staff_code ?? null,
            status: data.status ?? "active",
            mustChangePassword: Boolean(data.must_change_password),
          });
        } else {
          setProfile(null);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error:
          "No database is connected yet, so no accounts exist. Ask your administrator to finish the Supabase setup.",
      };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Deactivated accounts should never get past the sign-in screen, even
    // though the password itself is still correct.
    if (data.user) {
      const { data: row } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", data.user.id)
        .single();
      if (row?.status === "suspended") {
        await supabase.auth.signOut();
        return { error: "This account has been deactivated. Contact your administrator." };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!error && data) {
      const role = (data.role ?? "staff") as StaffRole;
      setProfile({
        id: data.id,
        fullName: data.full_name ?? data.email,
        email: data.email,
        role,
        roleLabel: STAFF_ROLE_LABELS[role] ?? role,
        jobTitle: data.job_title ?? null,
        staffCode: data.staff_code ?? null,
        status: data.status ?? "active",
        mustChangePassword: Boolean(data.must_change_password),
      });
    }
  };

  return (
    <AuthContext.Provider value={{ loading, user, profile, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
