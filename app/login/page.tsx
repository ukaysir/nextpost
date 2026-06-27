"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth-client";
import { isTestCredential, signInTestUser } from "@/lib/test-auth";

function getSafeNextPath() {
  if (typeof window === "undefined") return "/analyze";

  const value = new URLSearchParams(window.location.search).get("next");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/analyze";
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function startGoogleLogin() {
    setError("");
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle(getSafeNextPath());
    } catch (error) {
      setIsGoogleLoading(false);
      setError(error instanceof Error ? error.message : "Gmail 로그인을 시작하지 못했습니다.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isTestCredential(identifier, password)) {
      setError("테스트 계정은 아이디 test / 비밀번호 test 입니다.");
      return;
    }

    signInTestUser();
    router.replace(getSafeNextPath());
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[linear-gradient(rgba(18,22,28,.46),rgba(18,22,28,.6)),url('/assets/kf21-hero.jpg')] bg-cover bg-center">
      <header className="page-shell flex items-center py-5 text-white sm:py-7">
        <Link className="text-[19px] font-black tracking-[1px] drop-shadow sm:text-[22px]" href="/">
          NEXTPOST
        </Link>
        <Link className="ml-auto inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 text-xs font-extrabold backdrop-blur sm:text-sm" href="/">
          <ArrowLeft size={15} />
          홈으로
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-[980px] items-center px-3 pb-8 pt-2 sm:min-h-[calc(100dvh-92px)] sm:px-4 sm:pb-16 sm:pt-0">
        <div className="grid w-full gap-4 sm:gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="text-white">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-extrabold backdrop-blur sm:text-sm">
              <ShieldCheck size={15} />
              Supabase Gmail 로그인
            </p>
            <h1 className="mt-4 text-[32px] font-black leading-[1.16] tracking-normal drop-shadow-[0_2px_18px_rgba(0,0,0,.35)] sm:mt-5 sm:text-4xl md:text-5xl">
              방산 커리어 분석을
              <br />
              계속 이어갑니다
            </h1>
            <p className="mt-3 max-w-[520px] text-[13.5px] font-bold leading-6 text-white/90 sm:mt-5 sm:text-base sm:leading-8">
              Gmail 계정으로 로그인하면 리포트가 사용자별로 저장되고, 대시보드에서 이전 분석 결과를 다시 확인할 수 있습니다.
            </p>
          </div>

          <section className="np-card p-5 sm:p-6 md:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--primary)] text-white sm:h-11 sm:w-11 sm:rounded-[13px]">
                <LockKeyhole size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black tracking-normal sm:text-2xl">로그인</h2>
                <p className="mt-1 text-xs font-bold text-[var(--caption)] sm:text-sm">Gmail OAuth 또는 테스트 계정</p>
              </div>
            </div>

            <button
              className="focus-ring mt-6 inline-flex h-[46px] w-full items-center justify-center gap-3 rounded-full border border-[#8B95A1] bg-white px-5 text-[15px] font-black text-[var(--foreground)] shadow-[0_1px_0_rgba(15,23,42,.04)] transition hover:border-[var(--foreground)] hover:bg-[#F8FAFB] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:h-[48px] sm:text-base"
              disabled={isGoogleLoading}
              type="button"
              onClick={startGoogleLogin}
            >
              <span
                aria-hidden="true"
                className="grid h-6 w-6 place-items-center rounded-full text-[21px] font-black leading-none"
                style={{
                  background:
                    "conic-gradient(from -40deg, #4285F4 0 25%, #34A853 25% 48%, #FBBC05 48% 72%, #EA4335 72% 100%)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                G
              </span>
              {isGoogleLoading ? "Google 연결 중" : "Google로 로그인"}
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs font-black text-[var(--caption)]">테스트 계정</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <form onSubmit={submit}>
              <div className="grid gap-4">
                <label className="grid gap-2 text-[13px] font-black text-[var(--muted-foreground)] sm:text-[13.5px]">
                  아이디 또는 이메일
                  <span className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--caption)]" size={17} />
                    <input
                      className="input input-with-icon"
                      autoComplete="username"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="test"
                    />
                  </span>
                </label>

                <label className="grid gap-2 text-[13px] font-black text-[var(--muted-foreground)] sm:text-[13.5px]">
                  비밀번호
                  <span className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--caption)]" size={17} />
                    <input
                      className="input input-with-icon"
                      autoComplete="current-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="test"
                    />
                  </span>
                </label>
              </div>

              {error ? (
                <div className="mt-4 rounded-[10px] border border-[#F0C2C2] bg-[#FFF2F2] px-3 py-2.5 text-[13px] font-bold text-[var(--danger)] sm:px-4 sm:py-3 sm:text-sm">
                  {error}
                </div>
              ) : null}

              <button
                className="focus-ring mt-5 inline-flex h-[48px] w-full items-center justify-center gap-3 rounded-[10px] border border-[var(--border)] bg-white px-5 text-[14px] font-black text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!identifier || !password}
                type="submit"
              >
                테스트 로그인
                <ArrowRight size={17} />
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
