"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentTestUser, signOutTestUser, TestUser } from "@/lib/test-auth";

export function AuthMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<TestUser | null>(null);

  useEffect(() => {
    const syncUser = () => setUser(getCurrentTestUser());
    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("nextpost-auth-change", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("nextpost-auth-change", syncUser);
    };
  }, []);

  if (!user) {
    const nextPath = pathname && pathname !== "/login" ? pathname : "/analyze";
    return (
      <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
        로그인
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-3">
      {compact ? null : (
        <span className="hidden items-center gap-1 md:inline-flex">
          <UserRound size={15} />
          {user.id}
        </span>
      )}
      <Link className="inline-flex items-center gap-1 font-extrabold" href="/dashboard">
        대시보드
      </Link>
      <button
        className="inline-flex items-center gap-1 font-extrabold"
        type="button"
        onClick={() => {
          signOutTestUser();
          router.push(`/login?next=${encodeURIComponent(pathname || "/analyze")}`);
        }}
      >
        <LogOut size={15} />
        로그아웃
      </button>
    </span>
  );
}
