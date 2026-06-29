import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthMenu } from "@/components/auth-menu";
import {
  getRuntimeAppData,
  getRuntimeDataFreshness,
} from "@/lib/runtime-data";

export default async function AboutPage() {
  const data = await getRuntimeAppData();
  const freshness = await getRuntimeDataFreshness();

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
        <header className="page-shell flex items-center py-5 md:py-7">
          <Link className="text-[20px] font-black tracking-[1px] drop-shadow md:text-[23px]" href="/">
            NEXTPOST
          </Link>
          <nav className="ml-auto flex items-center gap-3 text-xs font-extrabold drop-shadow md:gap-8 md:text-sm">
            <Link href="/analyze">분석하기</Link>
            <Link className="hidden sm:inline" href="/results">리포트 보기</Link>
            <AuthMenu compact />
          </nav>
        </header>

        <div className="page-shell pb-10 pt-5 md:pb-20 md:pt-14">
          <h1 className="mt-4 max-w-4xl text-[32px] font-black leading-tight tracking-normal drop-shadow-[0_2px_18px_rgba(0,0,0,.35)] md:mt-5 md:text-6xl">
            감이 아니라,
            <br />
            공개 데이터로 검증합니다
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-white/90 md:mt-6 md:text-lg md:leading-8">
            NEXTPOST는 군 경력을 방산 직무 언어로 변환하고, 방산업체 지정현황,
            국내조달 계약정보, 공식 채용 링크, OpenDART 재무/임직원 데이터, 출처 등급을
            결합해 추천 기업과 준비 로드맵의 근거를 제시합니다.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[#F8FAFB]">
        <div className="page-shell py-10 text-center md:py-16">
          <p className="text-xs font-black tracking-[1.5px] text-[var(--primary)] md:text-sm">
            WHY NEXTPOST
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-[26px] font-black leading-tight tracking-normal md:text-4xl">
            &quot;전역하면 무엇을 할 수 있을까?&quot;
            <br />
            그 막막함에서 시작했습니다
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-sm font-bold leading-7 text-[var(--muted-foreground)] md:mt-6 md:text-base md:leading-8">
            군에서 쌓은 통신, 정비, 지휘통제 경험은 분명한 전문성입니다. 다만 그 경험을 사회의
            채용 언어로 옮기기가 어렵습니다. NEXTPOST는 군 경력을 방산 직무 요건으로 번역하고,
            공공데이터로 확인 가능한 기업과 준비 경로를 함께 제시합니다.
          </p>
        </div>
      </section>

      <section className="page-shell py-8 md:py-16">
        <div className="mb-5 md:mb-8">
          <p className="text-sm font-black tracking-[1px] text-[var(--primary)]">DATA FOUNDATION</p>
          <h2 className="mt-2 text-2xl font-black tracking-normal md:text-4xl">
            납득할 수 있는 커리어 추천, NEXTPOST 의 투명한 데이터로 확인하세요
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <MetricCard
            label="방산 기업"
            value={`${data.companies.length}개`}
            caption="방산업체 지정현황 기준"
          />
          <MetricCard
            label="계약 원천"
            value={`${data.contractRecords.length.toLocaleString("ko-KR")}건`}
            caption={`${companiesWithContracts}개 기업 매칭`}
          />
          <MetricCard
            label="출처 링크"
            value={`${data.companySources.length.toLocaleString("ko-KR")}건`}
            caption={`정부/공식 출처 ${officialSources.toLocaleString("ko-KR")}건`}
          />
          <MetricCard
            label="OpenDART 재무"
            value={`${data.companyFinancials.length.toLocaleString("ko-KR")}건`}
            caption={`${companiesWithFinancials}개 기업, 2021~2025 반영`}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:mt-4 md:grid-cols-4 md:gap-4">
          <MetricCard
            label="채용 URL"
            value={`${companiesWithCareers}/${data.companies.length}`}
            caption={`${companiesWithJobPostings}개 기업 채용 포인터`}
          />
          <MetricCard
            label="기업 프로필"
            value={`${data.companyProfiles.length}/${data.companies.length}`}
            caption={`홈페이지 ${companiesWithHomepage}개`}
          />
          <MetricCard
            label="직무 요구역량"
            value={`${data.jobRequirements.length.toLocaleString("ko-KR")}건`}
            caption="직무별 기술, 경험, 키워드"
          />
          <MetricCard
            label="교육/자격 데이터"
            value={`${data.educationCerts.length.toLocaleString("ko-KR")}건`}
            caption="교육 과정과 추천 자격"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:mt-4 md:grid-cols-4 md:gap-4">
          <MetricCard
            label="최근 출처 수집"
            value={formatFreshDate(freshness.latest_source_at)}
            caption="정부/기업/공개 출처 기준"
          />
          <MetricCard
            label="최근 계약 기준"
            value={formatFreshDate(freshness.latest_contract_date)}
            caption="국내조달 계약일 기준"
          />
          <MetricCard
            label="채용 신호 수집"
            value={formatFreshDate(freshness.latest_job_posting_at)}
            caption="기업별 채용 포인터 기준"
          />
          <MetricCard
            label="재무 기준연도"
            value={freshness.latest_financial_year ? `${freshness.latest_financial_year}년` : "-"}
            caption="OpenDART 재무 데이터 기준"
          />
        </div>

        <div className="mt-5">
          <section className="np-card p-4 md:p-8">
            <p className="text-sm font-black tracking-[1px] text-[var(--primary)]">
              HOW IT WORKS
            </p>
            <h2 className="mt-2 text-xl font-black tracking-normal md:mt-3 md:text-2xl">
              군 경력에서 방산 직무까지
            </h2>
            <div className="mt-4 grid gap-3 md:mt-6 md:grid-cols-4 md:gap-4">
              {[
                ["01", "군 경력 입력", "군별, 계급, 병과, 보직, 전공과 자격 정보를 구조화합니다."],
                ["02", "직무 언어 변환", "복무 경험을 방산 분야와 직무 요구역량으로 매핑합니다."],
                ["03", "공개 데이터 매칭", "계약, 기업 프로필, 채용 URL, OpenDART 재무, 출처 등급을 결합합니다."],
                ["04", "근거형 리포트 생성", "추천 기업, 채용 신호, 직무 준비도, 교육 로드맵을 한 화면에 제공합니다."],
              ].map(([no, title, body]) => (
                <div className="flex gap-3 md:block" key={no}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[var(--primary)] text-xs font-black text-white md:h-11 md:w-11 md:rounded-[13px] md:text-sm">
                    {no}
                  </span>
                  <div className="md:mt-4">
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

      <section className="page-shell pb-12 md:pb-20">
        <div className="relative overflow-hidden rounded-[16px] bg-[#252C36] p-5 text-white md:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center grayscale"
            style={{ backgroundImage: "url('/assets/about-tank.jpg')", opacity: 0.24 }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-[#252C36]/78" />
          <div className="relative z-10">
            <p className="text-sm font-black tracking-[1px] text-white/70">DATA FIRST</p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-normal md:mt-3 md:text-4xl">
              지금 NEXTPODT 와 함께 당신의 커리어를 설계해보세요.
            </h2>
            <Link
              className="focus-ring mt-6 inline-flex h-11 w-full items-center justify-center gap-3 rounded-[10px] bg-[#3A404A] px-5 font-black text-white transition hover:bg-[#464D58] sm:w-auto md:mt-8 md:h-12 md:px-6"
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
  label,
  value,
}: {
  caption: string;
  label: string;
  value: string;
}) {
  return (
    <article className="np-card p-4 md:p-5">
      <p className="text-xs font-extrabold text-[var(--caption)] md:text-sm">{label}</p>
      <p className="mt-2 break-words text-2xl font-black tracking-normal md:mt-3 md:text-3xl">{value}</p>
      <p className="mt-2 text-xs font-bold text-[var(--caption)]">{caption}</p>
    </article>
  );
}

function formatFreshDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
