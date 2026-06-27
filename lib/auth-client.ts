"use client";

import { useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getCurrentTestUser, signOutTestUser } from "@/lib/test-auth";

export type AppUser = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  provider: "google" | "test";
};

type AuthState = {
  user: AppUser | null;
  isLoading: boolean;
};

const authChangeEvent = "nextpost-auth-change";

function getSafeNextPath(nextPath: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) return "/analyze";
  return nextPath;
}

function userFromSupabase(user: User): AppUser {
  const metadata = user.user_metadata ?? {};
  const name =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : user.email ?? "Google 사용자";
  const avatarUrl =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : undefined;

  return {
    id: user.id,
    name,
    email: user.email ?? undefined,
    avatarUrl,
    provider: "google",
  };
}

function userFromSession(session: Session | null) {
  return session?.user ? userFromSupabase(session.user) : null;
}

export async function getCurrentAppUser(): Promise<AppUser | null> {
  const supabase = await getSupabaseBrowserClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const user = userFromSession(data.session);
    if (user) return user;
  }

  const testUser = getCurrentTestUser();
  if (!testUser) return null;

  return {
    id: testUser.id,
    name: testUser.name,
    email: "test@nextpost.local",
    provider: "test",
  };
}

export function useAuthUser(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  useEffect(() => {
    let active = true;
    let unsubscribeSupabase: (() => void) | null = null;

    async function syncUser() {
      const user = await getCurrentAppUser();
      if (active) setState({ user, isLoading: false });
    }

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener(authChangeEvent, syncUser);

    getSupabaseBrowserClient().then((supabase) => {
      if (!supabase || !active) return;
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setState({ user: userFromSession(session) ?? null, isLoading: false });
        window.dispatchEvent(new Event(authChangeEvent));
      });
      unsubscribeSupabase = () => data.subscription.unsubscribe();
    });

    return () => {
      active = false;
      window.removeEventListener("storage", syncUser);
      window.removeEventListener(authChangeEvent, syncUser);
      unsubscribeSupabase?.();
    };
  }, []);

  return state;
}

export async function signInWithGoogle(nextPath: string) {
  const supabase = await getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase URL 또는 publishable key가 설정되어 있지 않습니다.");
  }

  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
    getSafeNextPath(nextPath),
  )}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;
  if (data.url) window.location.href = data.url;
}

export async function signOutCurrentUser() {
  const supabase = await getSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut();
  signOutTestUser();
  window.dispatchEvent(new Event(authChangeEvent));
}

export async function getAuthHeaders() {
  const headers: Record<string, string> = {};
  const supabase = await getSupabaseBrowserClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
      return headers;
    }
  }

  const testUser = getCurrentTestUser();
  if (testUser) headers["x-nextpost-test-user"] = testUser.id;
  return headers;
}
