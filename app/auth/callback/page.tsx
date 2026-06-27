"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getAuthPublicConfig, getSupabaseBrowserClient } from "@/lib/supabase-browser";

function getSafeNextPath() {
  if (typeof window === "undefined") return "/analyze";

  const value = new URLSearchParams(window.location.search).get("next");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/analyze";
  return value;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function completeLogin() {
      try {
        const config = await getAuthPublicConfig();
        if (config.siteUrl) {
          const canonicalOrigin = new URL(config.siteUrl).origin;
          if (window.location.origin !== canonicalOrigin) {
            window.location.replace(
              `${canonicalOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`,
            );
            return;
          }
        }

        const supabase = await getSupabaseBrowserClient();
        if (!supabase) throw new Error("Supabase 인증 설정이 없습니다.");

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error("로그인 세션을 확인하지 못했습니다.");

        window.dispatchEvent(new Event("nextpost-auth-change"));
        router.replace(getSafeNextPath());
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : "Gmail 로그인 처리 중 오류가 발생했습니다.");
        }
      }
    }

    completeLogin();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4">
      <section className="np-card w-full max-w-[420px] p-8 text-center">
        {error ? (
          <CheckCircle2 className="mx-auto text-[var(--danger)]" size={40} />
        ) : (
          <Loader2 className="mx-auto animate-spin text-[var(--primary)]" size={40} />
        )}
        <h1 className="mt-5 text-2xl font-black">{error ? "로그인 확인 실패" : "Gmail 로그인 확인 중"}</h1>
        <p className="mt-3 text-sm font-bold leading-7 text-[var(--muted-foreground)]">
          {error || "Supabase 세션을 확인한 뒤 이전 화면으로 이동합니다."}
        </p>
      </section>
    </main>
  );
}
