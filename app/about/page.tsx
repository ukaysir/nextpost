import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Database,
  FileSearch,
  LineChart,
  ShieldCheck,
} from "lucide-react";
import { AuthMenu } from "@/components/auth-menu";
import { IndustryChart } from "@/components/industry-chart";
import { getLatestRuntimeIndustryStat, getRuntimeAppData } from "@/lib/runtime-data";
import { formatWon } from "@/lib/utils";

export default async function AboutPage() {
  const data = await getRuntimeAppData();
  const latest = await getLatestRuntimeIndustryStat();

  const companiesWithContracts = new Set(
    data.contractRecords.map((record) => record.company_id).filter(Boolean),
  ).size;
  const companiesWithFinancials = new Set(data.companyFinancials.map((item) => item.company_id)).size;
  const companiesWithJobPostings = new Set(data.jobPostings.map((item) => item.company_id)).size;
  const companiesWithCareers = data.companies.filter((company) => company.careers_page_url).length;
  const companiesWithHomepage = data.companyProfiles.filter((profile) => profile.homepage_url).length;
  const officialSources = data.companySources.filter((source) =>
    ["A_GOV_OFFICIAL", "B_COMPANY_OFFICIAL"].includes(source.source_grade),
  ).length;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="np-image-nav text-white">
        <header className="page-shell flex items-center py-7">
          <Link className="text-[23px] font-black tracking-[1px] drop-shadow" href="/">
            NEXTPOST
          </Link>
          <nav className="ml-auto flex items-center gap-5 text-sm font-extrabold drop-shadow md:gap-8">
            <Link href="/analyze">분석하기</Link>
            <Link href="/results">리포트 보기</Link>
            <AuthMenu compact />
          </nav>
        </header>

        <div className="page-shell pb-16 pt-8 md:pb-20 md:pt-14">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] border border-white/30 bg-white/12 px-4 text-sm font-black backdrop-blur transition hover:bg-white/20"
              href="/"
            >
              <ArrowLeft size={17} />
              랜딩으로
            </Link>
            <span className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-white/30 bg-white/15 px-4 text-sm font-extrabold backdrop-blur">
              <ShieldCheck size={16} />
              About NEXTPOST
            </span>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-normal drop-shadow-[0_2px_18px_rgba(0,0,0,.35)] md:text-6xl">
            감이 아니라,
            <br />
            공개 데이터로 검증합니다
          </h1>
          <p className="mt-6 max-w-3xl text-base font-bold leading-8 text-white/90 md:text-lg">
            NEXTPOST는 군 경력을 방산 직무 언어로 변환하고, 방산업체 지정현황,
            국내조달 계약정보, 공식 채용 링크, OpenDART 재무/임직원 데이터, 출처 등급을
            결합해 추천 기업과 준비 로드맵의 근거를 화면에 남깁니다.
          </p>
        </div>
      </section>

      <section className="page-shell py-12 md:py-16">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={BriefcaseBusiness}
            label="방산 기업"
            value={`${data.companies.length}개`}
            caption="방산업체 지정현황 기준"
          />
          <MetricCard
            icon={FileSearch}
            label="계약 원천"
            value={`${data.contractRecords.length.toLocaleString("ko-KR")}건`}
            caption={`${companiesWithContracts}개 기업 매칭`}
          />
          <MetricCard
            icon={Database}
            label="출처 링크"
            value={`${data.companySources.length.toLocaleString("ko-KR")}건`}
            caption={`정부/공식 출처 ${officialSources.toLocaleString("ko-KR")}건`}
          />
          <MetricCard
            icon={LineChart}
            label="OpenDART 재무"
            value={`${data.companyFinancials.length.toLocaleString("ko-KR")}건`}
            caption={`${companiesWithFinancials}개 기업, 2021~2025 반영`}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={ShieldCheck}
            label="채용 URL"
            value={`${companiesWithCareers}/${data.companies.length}`}
            caption={`${companiesWithJobPostings}개 기업 채용 포인터`}
          />
          <MetricCard
            icon={BriefcaseBusiness}
            label="기업 프로필"
            value={`${data.companyProfiles.length}/${data.companies.length}`}
            caption={`홈페이지 ${companiesWithHomepage}개`}
          />
          <MetricCard
            icon={BarChart3}
            label={`${latest?.year ?? "-"} 산업 매출`}
            value={latest?.sales ? formatWon(Number(latest.sales) * 100_000_000) : "-"}
            caption={
              latest?.operating_profit_rate
                ? `영업이익률 ${latest.operating_profit_rate}%`
                : "방산 산업 통계 기준"
            }
          />
          <MetricCard
            icon={Database}
            label="교육/직무 데이터"
            value={`${data.educationCerts.length + data.jobRequirements.length}건`}
            caption="교육 과정, 자격, 직무 요구역량"
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
          <section className="np-card p-6 md:p-8">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-[var(--primary)]" size={22} />
              <h2 className="text-2xl font-black tracking-normal">방산 산업 추이</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              공개 산업 통계를 기반으로 방산 시장의 매출 흐름과 수익성 맥락을 요약합니다.
            </p>
            <div className="mt-5">
              <IndustryChart data={data.industryStats} />
            </div>
          </section>

          <section className="np-card p-6 md:p-8">
            <p className="text-sm font-black tracking-[1px] text-[var(--primary)]">
              HOW IT WORKS
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-normal">
              군 경력에서 방산 직무까지
            </h2>
            <div className="mt-6 grid gap-4">
              {[
                ["01", "군 경력 입력", "군별, 계급, 병과, 보직, 전공과 자격 정보를 구조화합니다."],
                ["02", "직무 언어 변환", "복무 경험을 방산 분야와 직무 요구역량으로 매핑합니다."],
                ["03", "공개 데이터 매칭", "계약, 기업 프로필, 채용 URL, OpenDART 재무, 출처 등급을 결합합니다."],
                ["04", "근거형 리포트 생성", "추천 기업, 계약 근거, 채용 신호, 재무 추이, 교육 로드맵을 한 화면에 제공합니다."],
              ].map(([no, title, body]) => (
                <div className="flex gap-4" key={no}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[var(--primary)] text-sm font-black text-white">
                    {no}
                  </span>
                  <div>
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="page-shell pb-20">
        <div className="grid gap-5 lg:grid-cols-[0.45fr_0.55fr]">
          <div className="np-card overflow-hidden p-0">
            <div className="h-full min-h-[360px] bg-[linear-gradient(rgba(25,31,40,.18),rgba(25,31,40,.24)),url('/assets/defense-data.jpg')] bg-cover bg-center" />
          </div>
          <div className="np-card p-7 md:p-10">
            <p className="text-sm font-black tracking-[1px] text-[var(--primary)]">
              DATA FIRST
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal md:text-4xl">
              추천의 근거를
              <br />
              숨기지 않습니다
            </h2>
            <p className="mt-5 text-base font-medium leading-8 text-[var(--muted-foreground)]">
              리포트는 추천 기업명만 보여주지 않습니다. 대표 계약, 수요기관, 채용 포인터,
              요구 역량, 평균급여와 직원 수, 출처 등급을 함께 보여주어 사용자가 왜 그 기업을
              준비해야 하는지 직접 확인할 수 있게 합니다.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                "계약 근거와 금액",
                "채용 신호와 직무 기능",
                "5년 재무/임직원 추이",
                "정부·기업 공식 출처 등급",
              ].map((item) => (
                <div
                  className="rounded-[12px] border border-[var(--border)] bg-[#F8FAFB] px-4 py-3 text-sm font-black"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
            <Link
              className="focus-ring mt-8 inline-flex h-12 items-center gap-3 rounded-[10px] bg-[var(--accent)] px-6 font-black text-white"
              href="/analyze"
            >
              지금 분석 시작
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  caption,
  icon: Icon,
  label,
  value,
}: {
  caption: string;
  icon: typeof BriefcaseBusiness;
  label: string;
  value: string;
}) {
  return (
    <article className="np-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-[var(--caption)]">{label}</p>
        <Icon className="text-[var(--primary)]" size={22} />
      </div>
      <p className="mt-3 text-3xl font-black tracking-normal">{value}</p>
      <p className="mt-2 text-xs font-bold text-[var(--caption)]">{caption}</p>
    </article>
  );
}
