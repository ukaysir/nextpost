"use client";

import { useEffect } from "react";
import { getAuthPublicConfig } from "@/lib/supabase-browser";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function hasAuthReturnPayload() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  return (
    params.has("code") ||
    params.has("error") ||
    hash.includes("access_token=") ||
    hash.includes("refresh_token=") ||
    hash.includes("error=")
  );
}

export function CanonicalAuthRedirect() {
  useEffect(() => {
    if (!isLocalHost(window.location.hostname) || !hasAuthReturnPayload()) return;

    let active = true;

    async function redirectAuthReturn() {
      const config = await getAuthPublicConfig();
      if (!active || !config.siteUrl) return;

      const canonicalOrigin = new URL(config.siteUrl).origin;
      if (window.location.origin === canonicalOrigin) return;

      window.location.replace(
        `${canonicalOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
    }

    redirectAuthReturn();
    return () => {
      active = false;
    };
  }, []);

  return null;
}
