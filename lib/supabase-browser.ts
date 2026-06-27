"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

type AuthPublicConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  siteUrl: string;
};

let configPromise: Promise<AuthPublicConfig> | null = null;
let client: SupabaseClient | null = null;

async function loadAuthConfig() {
  if (!configPromise) {
    configPromise = fetch("/api/auth/config", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Supabase 인증 설정을 불러오지 못했습니다.");
      return (await response.json()) as AuthPublicConfig;
    });
  }

  return configPromise;
}

export async function getAuthPublicConfig() {
  return loadAuthConfig();
}

export async function getSupabaseBrowserClient() {
  const config = await loadAuthConfig();
  if (!config.supabaseUrl || !config.supabasePublishableKey) return null;

  if (!client) {
    client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: "nextpost:supabase-auth",
      },
    });
  }

  return client;
}

export async function getSupabaseAuthSettings() {
  const config = await loadAuthConfig();
  if (!config.supabaseUrl || !config.supabasePublishableKey) return null;

  const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
    headers: {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${config.supabasePublishableKey}`,
    },
  });
  if (!response.ok) return null;
  return (await response.json()) as {
    external?: Record<string, boolean>;
  };
}
