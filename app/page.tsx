import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthMenu } from "@/components/auth-menu";

export default function Home() {
  return (
    <main className="min-h-dvh md:h-dvh md:overflow-hidden">
      <section className="np-hero-bg relative flex min-h-dvh flex-col overflow-hidden text-white">
        <header className="page-shell flex shrink-0 items-center py-5 md:py-8">
          <Link className="text-[20px] font-black tracking-[1px] drop-shadow md:text-[23px]" href="/">
            NEXTPOST
          </Link>
          <nav className="ml-auto flex items-center gap-3 text-xs font-extrabold drop-shadow md:gap-10 md:text-sm">
            <Link href="/about">About NEXTPOST</Link>
            <Link className="hidden sm:inline" href="/results">
              분석 보기
            </Link>
            <AuthMenu compact />
          </nav>
        </header>

        <div className="page-shell flex min-h-0 flex-1 items-center py-8">
          <div className="max-w-[710px] pb-6 md:pb-14">
            <h1 className="text-[34px] font-black leading-[1.14] tracking-normal drop-shadow-[0_2px_18px_rgba(0,0,0,.42)] md:text-[64px]">
              전역, 그 다음
              <br />
              보직을 설계하다
            </h1>
            <p className="mt-5 max-w-[620px] text-[15px] font-medium leading-7 text-[#f1f3f5] drop-shadow md:mt-7 md:text-lg md:leading-8">
              군 경력을 방산 직무 언어로 번역하고, 방산업체 지정현황과 계약, 채용,
              OpenDART 데이터를 근거로 맞춤 기업과 준비 로드맵을 제시합니다.
            </p>
            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap md:mt-10">
              <Link
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-3 rounded-[10px] bg-white px-5 py-3 text-base font-black !text-[var(--foreground)] shadow-[0_8px_28px_rgba(0,0,0,.26)] md:min-h-14 md:px-7 md:text-lg"
                href="/analyze"
              >
                지금 방산 커리어 분석하기
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
