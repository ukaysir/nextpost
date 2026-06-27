import Link from "next/link";
import { ArrowRight, BarChart3, BriefcaseBusiness, MapPinned, ShieldCheck } from "lucide-react";
import { IndustryChart } from "@/components/industry-chart";
import { getLatestRuntimeIndustryStat, getRuntimeAppData } from "@/lib/runtime-data";

export default async function Home() {
  const data = await getRuntimeAppData();
  const latest = await getLatestRuntimeIndustryStat();

  return (
    <main>
      <section className="border-b border-[var(--border)] bg-[#e7eee8]">
        <div className="page-shell grid min-h-[620px] grid-cols-1 gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b7c7bd] bg-white px-3 py-1 text-sm text-[#314540]">
              <ShieldCheck size={16} />
              병무청 · 방위사업청 공공데이터 기반
            </div>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal text-[#17211f] md:text-7xl">
              전역, 그 다음 보직을 설계하다
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4d5e59]">
              NEXTPOST는 전역 간부의 군 경력을 방산 직무 언어로 번역하고,
              공개 데이터 기반으로 적합 기업과 준비 로드맵을 제시합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-semibold text-white"
                href="/analyze"
              >
                내 방산 커리어 분석하기
                <ArrowRight size={18} />
              </Link>
              <a
                className="focus-ring inline-flex h-12 items-center rounded-md border border-[#b7c7bd] bg-white px-5 font-semibold text-[#243734]"
                href="#data"
              >
                데이터 보기
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-[#c9d4cb] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">최근 방산업체 매출</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {latest ? `${(Number(latest.sales) / 10000).toFixed(1)}조원` : "-"}
                  </p>
                </div>
                <BarChart3 className="text-[var(--primary)]" size={32} />
              </div>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {latest?.year}년 기준 · 영업이익률 {latest?.operating_profit_rate}%
              </p>
            </div>
            <div className="rounded-lg border border-[#c9d4cb] bg-white p-5 shadow-sm">
              <IndustryChart data={data.industryStats} />
            </div>
          </div>
        </div>
      </section>

      <section id="data" className="page-shell py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: BriefcaseBusiness,
              title: "군 경력 번역",
              body: "병과, 보직, 운용 장비를 방산 직무 역량 키워드로 전환합니다.",
            },
            {
              icon: BarChart3,
              title: "기업·직무 매칭",
              body: "방산업체 지정현황과 계약 데이터를 조합해 후보 기업을 우선순위화합니다.",
            },
            {
              icon: MapPinned,
              title: "전역 로드맵",
              body: "부족 역량, 추천 교육, 자격증, 전역 타이밍을 한 화면에서 제공합니다.",
            },
          ].map((item) => (
            <article
              className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm"
              key={item.title}
            >
              <item.icon className="text-[var(--accent)]" size={28} />
              <h2 className="mt-5 text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-[var(--border)] bg-white p-6">
          <p className="text-sm font-semibold text-[var(--primary)]">활용 데이터</p>
          <p className="mt-2 leading-7 text-[var(--muted-foreground)]">
            방산업체 지정현황, 국내조달 계약정보, 방산원가관리체계 인증업체,
            국방통합 용어사전, 병역진로설계지원센터 위치 데이터를 서버에서 직접 읽어
            분석에 사용합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
