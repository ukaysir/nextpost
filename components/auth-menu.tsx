"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { signOutCurrentUser, useAuthUser } from "@/lib/auth-client";

export function AuthMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthUser();

  if (isLoading) {
    return <span className="text-white/70">확인 중</span>;
  }

  if (!user) {
    const nextPath = pathname && pathname !== "/login" ? pathname : "/analyze";
    return <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>로그인</Link>;
  }

  return (
    <span className="inline-flex items-center gap-2 md:gap-3">
      {compact ? null : (
        <span className="hidden items-center gap-1 md:inline-flex">
          <UserRound size={15} />
          {user.email ?? user.id}
        </span>
      )}
      <Link className="inline-flex items-center gap-1 font-extrabold" href="/dashboard">
        {compact ? "My" : "대시보드"}
      </Link>
      <button
        aria-label="로그아웃"
        className="inline-flex items-center gap-1 font-extrabold"
        type="button"
        onClick={async () => {
          await signOutCurrentUser();
          router.push(`/login?next=${encodeURIComponent(pathname || "/analyze")}`);
        }}
      >
        <LogOut size={15} />
        <span className={compact ? "sr-only md:not-sr-only" : ""}>로그아웃</span>
      </button>
    </span>
  );
}
