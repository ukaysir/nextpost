"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BriefcaseBusiness, FileWarning, Link2, Loader2 } from "lucide-react";
import { AuthMenu } from "@/components/auth-menu";
import { getAuthHeaders } from "@/lib/auth-client";
import type { AuditCompanyGap, DataCoverageAuditState } from "@/lib/data-audit";

const numberFormatter = new Intl.NumberFormat("ko-KR");
const compactCurrencyFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const metricLabels: Record<string, string> = {
  companies: "방산 기업",
  companies_with_careers_url: "채용 URL 보유",
  companies_with_contract_records: "계약 보유 기업",
  companies_with_sources: "출처 보유 기업",
  companies_with_job_postings: "채용공고 보유",
  companies_with_financials: "재무 보유 기업",
  companies_with_avg_salary: "평균연봉 보유",
  company_sources: "출처 링크",
  contract_records: "개별 계약",
  job_postings: "채용공고",
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

export function AdminDataAudit() {
  const [state, setState] = useState<DataCoverageAuditState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAudit() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/data-audit", {
          cache: "no-store",
          headers: await getAuthHeaders(),
        });
        const payload = (await response.json()) as DataCoverageAuditState;
        if (!response.ok) throw new Error(payload.message || "데이터 감사를 불러오지 못했습니다.");
        if (!ignore) setState(payload);
      } catch (error) {
        if (!ignore) {
          setError(error instanceof Error ? error.message : "데이터 감사를 불러오지 못했습니다.");
          setState(null);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadAudit();
    return () => {
      ignore = true;
    };
  }, []);

  const audit = state?.audit ?? null;
  const totals = useMemo(() => audit?.totals ?? {}, [audit]);
  const headlineMetrics = useMemo(
    () => ["companies", "company_sources", "contract_records", "job_postings"].map((key) => pickMetric(totals, key)),
    [totals],
  );
  const coverageMetrics = useMemo(
    () =>
      [
        "companies_with_careers_url",
        "companies_with_contract_records",
        "companies_with_sources",
        "companies_with_job_postings",
        "companies_with_financials",
        "companies_with_avg_salary",
      ].map((key) => pickMetric(totals, key)),
    [totals],
  );

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="np-image-nav text-white">
        <div className="page-shell flex items-center py-5 md:py-7">
          <Link className="text-[20px] font-black tracking-[1px] drop-shadow md:text-[22px]" href="/">
            NEXTPOST
          </Link>
          <nav className="ml-auto flex items-center gap-3 text-xs font-extrabold drop-shadow md:gap-5 md:text-sm">
            <Link href="/dashboard">대시보드</Link>
            <Link href="/analyze">분석</Link>
            <AuthMenu compact />
          </nav>
        </div>

        <section className="page-shell pb-9 pt-4 md:pb-14 md:pt-8">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/30 bg-white/12 px-3 text-xs font-black backdrop-blur"
            href="/dashboard"
          >
            <ArrowLeft size={15} />
            돌아가기
          </Link>
          <h1 className="mt-6 max-w-3xl text-[32px] font-black leading-tight tracking-normal md:text-6xl">
            공개 데이터 커버리지와 보강 우선순위를 점검합니다
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-white/90 md:text-base">
            추천 근거에 직접 영향을 주는 채용 URL, 계약, 출처, OpenDART 재무 데이터의 누락 상태를 운영자가 확인하는 화면입니다.
          </p>
        </section>
      </header>

      <section className="page-shell py-7 md:py-10">
        {isLoading ? (
          <div className="np-card flex items-center gap-3 p-5 text-sm font-bold text-[var(--caption)]">
            <Loader2 className="animate-spin" size={18} />
            데이터 감사 결과를 불러오는 중입니다.
          </div>
        ) : null}

        {error ? (
          <div className="np-card flex items-start gap-3 border-[#F0C2C2] bg-[#FFF2F2] p-5 text-sm font-bold leading-7 text-[var(--danger)]">
            <AlertTriangle className="mt-1 shrink-0" size={20} />
            {error}
          </div>
        ) : null}

        {audit ? (
          <div className="grid gap-5 md:gap-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {headlineMetrics.map((metric) => (
                <MetricCard key={metric.key} label={metric.label} value={formatNumber(metric.value)} />
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <section className="np-card p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black tracking-normal md:text-2xl">핵심 커버리지</h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                      리포트 신뢰도와 추천 근거에 직접 연결되는 데이터 보유 현황입니다.
                    </p>
                  </div>
                  <BriefcaseBusiness className="shrink-0 text-[var(--primary)]" size={24} />
                </div>

                <div className="mt-5 grid gap-2 md:grid-cols-2">
                  {coverageMetrics.map((metric) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-[10px] border border-[var(--border)] bg-[#F8FAFB] px-4 py-3"
                      key={metric.key}
                    >
                      <span className="text-sm font-bold text-[var(--muted-foreground)]">{metric.label}</span>
                      <span className="font-black">{formatNumber(metric.value)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="np-card p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-black tracking-normal md:text-2xl">우선 보강 항목</h2>
                  <AlertTriangle className="shrink-0 text-[var(--warning)]" size={24} />
                </div>
                <div className="mt-4 grid gap-3">
                  {audit.priority_gaps.length ? (
                    audit.priority_gaps.map((gap) => (
                      <p className="rounded-[10px] bg-[#FFF7E8] px-4 py-3 text-sm font-bold leading-6 text-[#7A4A00]" key={gap}>
                        {gap}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm font-bold text-[var(--caption)]">우선 보강 항목이 없습니다.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="np-card p-4 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-normal md:text-2xl">분야별 기업 수</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                    추천 후보군이 특정 방산 분야에 과도하게 쏠리는지 확인합니다.
                  </p>
                </div>
                <Link2 className="shrink-0 text-[var(--primary)]" size={24} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                {Object.entries(audit.field_counts).map(([field, count]) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[#F8FAFB] px-3 py-2.5"
                    key={field}
                  >
                    <span className="text-sm font-black">{field}</span>
                    <span className="text-sm font-bold text-[var(--caption)]">{formatNumber(count)}개</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
              <GapTable
                description="계약 규모는 큰데 채용 URL이 없는 기업입니다. 추천 후 사용자가 바로 행동할 링크가 부족합니다."
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="np-card p-4 md:p-5">
      <p className="text-xs font-extrabold text-[var(--caption)] md:text-sm">{label}</p>
      <p className="mt-2 break-words text-2xl font-black tracking-normal md:text-3xl">{value}</p>
    </article>
  );
}

function GapTable({ items, title, description }: { items: AuditCompanyGap[]; title: string; description: string }) {
  return (
    <section className="np-card p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-normal md:text-2xl">{title}</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted-foreground)]">{description}</p>
        </div>
        <FileWarning className="shrink-0 text-[var(--warning)]" size={24} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--caption)]">
              <th className="py-3 pr-4 font-black">기업</th>
              <th className="py-3 pr-4 font-black">분야</th>
              <th className="py-3 pr-4 text-right font-black">계약금액</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 20).map((item) => (
              <tr className="border-b border-[var(--border)] last:border-0" key={`${title}-${item.id}`}>
                <td className="py-3 pr-4 font-black">{item.company_name}</td>
                <td className="py-3 pr-4 font-bold text-[var(--muted-foreground)]">{item.defense_field}</td>
                <td className="py-3 pr-4 text-right font-black">{formatWon(item.total_contract_amount)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="py-5 text-[var(--caption)]" colSpan={3}>
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
