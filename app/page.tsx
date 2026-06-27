import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AuthMenu } from "@/components/auth-menu";

export default function Home() {
  return (
    <main className="h-dvh overflow-hidden">
      <section className="np-hero-bg relative flex h-full flex-col overflow-hidden text-white">
        <header className="page-shell flex shrink-0 items-center py-6 md:py-8">
          <Link className="text-[23px] font-black tracking-[1px] drop-shadow" href="/">
            NEXTPOST
          </Link>
          <nav className="ml-auto flex items-center gap-5 text-sm font-extrabold drop-shadow md:gap-10">
            <Link href="/about">About NEXTPOST</Link>
            <Link href="/results">분석 보기</Link>
            <AuthMenu compact />
          </nav>
        </header>

        <div className="page-shell flex min-h-0 flex-1 items-center">
          <div className="max-w-[710px] pb-14">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-extrabold backdrop-blur">
              <ShieldCheck size={16} />
              공개 데이터 기반 방산 커리어 분석
            </p>
            <h1 className="mt-6 text-[42px] font-black leading-[1.16] tracking-normal drop-shadow-[0_2px_18px_rgba(0,0,0,.42)] md:mt-7 md:text-[64px]">
              전역, 그 다음
              <br />
              보직을 설계한다
            </h1>
            <p className="mt-6 max-w-[620px] text-base font-medium leading-8 text-[#f1f3f5] drop-shadow md:mt-7 md:text-lg">
              군 경력을 방산 직무 언어로 번역하고, 방산업체 지정현황과 계약,
              채용, OpenDART 데이터를 근거로 맞춤 기업과 준비 로드맵을 제시합니다.
            </p>
            <div className="mt-9 flex flex-wrap gap-3 md:mt-10">
              <Link
                className="focus-ring inline-flex min-h-14 items-center gap-4 rounded-[10px] bg-white px-7 py-3 text-base font-black !text-[var(--foreground)] shadow-[0_8px_28px_rgba(0,0,0,.26)] md:text-lg"
                href="/analyze"
              >
                방산 커리어 분석하기
                <ArrowRight size={20} />
              </Link>
              <Link
                className="focus-ring inline-flex min-h-14 items-center rounded-[10px] border border-white/35 bg-white/10 px-6 font-extrabold backdrop-blur"
                href="/about"
              >
                About NEXTPOST
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
