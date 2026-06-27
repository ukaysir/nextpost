import Link from "next/link";
import { AlertTriangle, ArrowLeft, BriefcaseBusiness, Database, FileWarning, Link2 } from "lucide-react";
import { getDataCoverageAudit, type AuditCompanyGap } from "@/lib/data-audit";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("ko-KR");
const compactCurrencyFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const metricLabels: Record<string, string> = {
  companies: "기업",
  companies_with_careers_url: "채용 URL 보유",
  profiles: "기업 프로필",
  profiles_with_careers_url: "프로필 채용 URL",
  profiles_with_homepage: "홈페이지 보유",
  profiles_with_avg_salary: "프로필 평균연봉",
  companies_with_avg_salary: "평균연봉 보유 기업",
  company_financials: "재무 레코드",
  companies_with_financials: "재무 보유 기업",
  contract_records: "개별 계약",
  companies_with_contract_records: "계약 보유 기업",
  job_postings: "채용공고",
  companies_with_job_postings: "채용공고 보유 기업",
  company_sources: "출처",
  companies_with_sources: "출처 보유 기업",
  education_rows: "교육/자격",
  common_education_rows: "공통 교육",
  job_requirement_rows: "직무 요구사항",
  career_mapping_rows: "병과 매핑",
  legacy_air_field_rows: "구 항공 코드",
};

function formatNumber(value: number | undefined) {
  return numberFormatter.format(value ?? 0);
}

function formatWon(value: number) {
  return `${compactCurrencyFormatter.format(value)}원`;
}

function pickMetric(totals: Record<string, number>, key: string) {
  return {
    key,
    label: metricLabels[key] ?? key,
    value: totals[key] ?? 0,
  };
}

function GapTable({ items, title, description }: { items: AuditCompanyGap[]; title: string; description: string }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
        </div>
        <FileWarning className="shrink-0 text-[var(--accent)]" size={24} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
              <th className="py-3 pr-4 font-medium">기업</th>
              <th className="py-3 pr-4 font-medium">분야</th>
              <th className="py-3 pr-4 text-right font-medium">계약금액</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 20).map((item) => (
              <tr className="border-b border-[var(--border)] last:border-0" key={`${title}-${item.id}`}>
                <td className="py-3 pr-4 font-medium">{item.company_name}</td>
                <td className="py-3 pr-4 text-[var(--muted-foreground)]">{item.defense_field}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatWon(item.total_contract_amount)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="py-5 text-[var(--muted-foreground)]" colSpan={3}>
                  표시할 결손 항목이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function DataAuditPage() {
  const state = await getDataCoverageAudit();
  const audit = state.audit;

  const totals = audit?.totals ?? {};
  const headlineMetrics = [
    pickMetric(totals, "companies"),
    pickMetric(totals, "company_sources"),
    pickMetric(totals, "contract_records"),
    pickMetric(totals, "job_postings"),
  ];
  const coverageMetrics = [
    "companies_with_careers_url",
    "companies_with_contract_records",
    "companies_with_sources",
    "companies_with_job_postings",
    "companies_with_financials",
    "companies_with_avg_salary",
  ].map((key) => pickMetric(totals, key));

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="border-b border-[var(--border)] bg-[#e7eee8]">
        <div className="page-shell py-8">
          <Link
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-[#b7c7bd] bg-white px-3 text-sm font-semibold text-[#243734]"
            href="/"
          >
            <ArrowLeft size={16} />
            홈
          </Link>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#b7c7bd] bg-white px-3 py-1 text-sm text-[#314540]">
                <Database size={16} />
                데이터 신뢰도 운영 점검
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal text-[#17211f] md:text-5xl">
                보강 데이터 커버리지 감사
              </h1>
              <p className="mt-4 max-w-3xl leading-7 text-[#4d5e59]">
                추천 근거에 쓰이는 출처, 개별 계약, 채용 URL, 재무/연봉 결손을 한 화면에서 확인합니다.
                분석 결과의 신뢰도 점수를 낮추는 데이터 공백을 우선순위대로 추적하기 위한 운영 화면입니다.
              </p>
            </div>

            <div className="rounded-lg border border-[#c9d4cb] bg-white p-5 shadow-sm">
              <p className="text-sm text-[var(--muted-foreground)]">감사 모드</p>
              <p className="mt-1 text-2xl font-semibold">{audit?.mode ?? "미생성"}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                {state.available
                  ? "supabase/data_coverage_audit.json 기준"
                  : state.message}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-8">
        {!state.available ? (
          <div className="rounded-lg border border-[var(--border)] bg-white p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 text-[var(--accent)]" size={22} />
              <div>
                <h2 className="text-lg font-semibold">감사 파일을 읽지 못했습니다</h2>
                <p className="mt-2 leading-7 text-[var(--muted-foreground)]">{state.message}</p>
              </div>
            </div>
          </div>
        ) : null}

        {audit ? (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              {headlineMetrics.map((metric) => (
                <article className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm" key={metric.key}>
                  <p className="text-sm text-[var(--muted-foreground)]">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{formatNumber(metric.value)}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">핵심 커버리지</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      추천 기업 신뢰도 표시에 직접 영향을 주는 데이터 보유 현황입니다.
                    </p>
                  </div>
                  <BriefcaseBusiness className="shrink-0 text-[var(--primary)]" size={24} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {coverageMetrics.map((metric) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3"
                      key={metric.key}
                    >
                      <span className="text-sm text-[var(--muted-foreground)]">{metric.label}</span>
                      <span className="font-semibold">{formatNumber(metric.value)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold">우선 보강 항목</h2>
                  <AlertTriangle className="shrink-0 text-[var(--accent)]" size={24} />
                </div>
                <div className="mt-4 grid gap-3">
                  {audit.priority_gaps.map((gap) => (
                    <p className="rounded-md bg-[#fff7ed] px-4 py-3 text-sm leading-6 text-[#79320f]" key={gap}>
                      {gap}
                    </p>
                  ))}
                  {audit.priority_gaps.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">우선 보강 항목이 없습니다.</p>
                  ) : null}
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">분야별 기업 수</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    분야 코드 정규화와 추천 커버리지 편중을 확인하는 기준입니다.
                  </p>
                </div>
                <Link2 className="shrink-0 text-[var(--primary)]" size={24} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {Object.entries(audit.field_counts).map(([field, count]) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3"
                    key={field}
                  >
                    <span className="text-sm font-medium">{field}</span>
                    <span className="text-sm text-[var(--muted-foreground)]">{formatNumber(count)}개</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <GapTable
                description="계약금액이 큰데 채용 URL이 없는 기업입니다. 추천 후 행동 링크의 품질을 낮추는 주요 결손입니다."
                items={audit.missing.careers_url_top20_by_contract ?? []}
                title="채용 URL 미확보 상위 기업"
              />
              <GapTable
                description="OpenDART 또는 공식 사업보고서 기반 재무/연봉 보강이 필요한 기업입니다."
                items={audit.missing.financials_top20_by_contract ?? []}
                title="재무 데이터 미확보 상위 기업"
              />
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
