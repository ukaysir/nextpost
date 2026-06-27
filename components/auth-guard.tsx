"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuthUser } from "@/lib/auth-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthUser();

  useEffect(() => {
    if (isLoading || user) return;

    const nextPath = pathname && pathname.startsWith("/") ? pathname : "/analyze";
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [isLoading, pathname, router, user]);

  if (user) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <section className="np-card w-full max-w-[420px] p-8 text-center">
        {isLoading ? (
          <Loader2 className="mx-auto animate-spin text-[var(--primary)]" size={38} />
        ) : (
          <ShieldCheck className="mx-auto text-[var(--primary)]" size={38} />
        )}
        <h1 className="mt-5 text-2xl font-black">로그인 확인 중</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
          NEXTPOST 계정 상태를 확인하고 있습니다.
        </p>
      </section>
    </main>
  );
}
