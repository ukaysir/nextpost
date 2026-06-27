"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
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
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(rgba(18,22,28,.44),rgba(18,22,28,.56)),url('/assets/kf21-hero.jpg')] bg-cover bg-center">
      <header className="page-shell flex items-center py-7 text-white">
        <Link className="text-[22px] font-black tracking-[1px] drop-shadow" href="/">
          NEXTPOST
        </Link>
        <Link className="ml-auto inline-flex items-center gap-2 text-sm font-extrabold drop-shadow" href="/">
          <ArrowLeft size={16} />
          홈으로
        </Link>
      </header>

      <section className="mx-auto flex min-h-[calc(100dvh-92px)] w-full max-w-[980px] items-center px-4 pb-16">
        <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="text-white">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-extrabold backdrop-blur">
              <ShieldCheck size={16} />
              NEXTPOST 테스트 로그인
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-normal drop-shadow-[0_2px_18px_rgba(0,0,0,.35)] md:text-5xl">
              방산 커리어 분석을
              <br />
              시작합니다
            </h1>
            <p className="mt-5 max-w-[520px] text-base font-bold leading-8 text-white/90">
              현재는 내부 테스트 계정으로만 접근합니다. 이후 Gmail 등 외부 계정 로그인을 연결할 수 있도록 인증 영역을 분리해 두었습니다.
            </p>
          </div>

          <form className="np-card p-6 md:p-8" onSubmit={submit}>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[var(--primary)] text-white">
                <LockKeyhole size={21} />
              </span>
              <div>
                <h2 className="text-2xl font-black tracking-normal">로그인</h2>
                <p className="mt-1 text-sm font-bold text-[var(--caption)]">테스트 계정: test / test</p>
              </div>
            </div>

            <div className="mt-7 grid gap-5">
              <label className="grid gap-2 text-[13.5px] font-black text-[var(--muted-foreground)]">
                아이디 또는 이메일
                <span className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--caption)]" size={18} />
                  <input
                    className="input input-with-icon"
                    autoComplete="username"
                    autoFocus
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="test"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-[13.5px] font-black text-[var(--muted-foreground)]">
                비밀번호
                <span className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--caption)]" size={18} />
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
              <div className="mt-5 rounded-[11px] border border-[#F0C2C2] bg-[#FFF2F2] px-4 py-3 text-sm font-bold text-[var(--danger)]">
                {error}
              </div>
            ) : null}

            <button
              className="focus-ring mt-7 inline-flex h-[54px] w-full items-center justify-center gap-3 rounded-[10px] bg-[var(--accent)] px-6 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!identifier || !password}
              type="submit"
            >
              로그인
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
