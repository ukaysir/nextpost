"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthMenu } from "@/components/auth-menu";
import { getAuthHeaders } from "@/lib/auth-client";
import { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type ServerReport = {
  id: string;
  share_id: string;
  title: string;
  matched_field?: string | null;
  matched_job_group?: string | null;
  top_company?: string | null;
  top_score?: number | null;
  created_at: string;
  local_only?: false;
};

type LocalReport = {
  id: string;
  share_id: "";
  title: string;
  input_payload: Record<string, unknown>;
  result_payload: AnalysisResult;
  matched_field?: string | null;
  matched_job_group?: string | null;
  top_company?: string | null;
  top_score?: number | null;
  created_at: string;
  local_only: true;
};

type DashboardReport = ServerReport | LocalReport;

export function UserDashboard() {
  const router = useRouter();
  const [reports, setReports] = useState<DashboardReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      setIsLoading(true);
      setError("");

      const localReports = readLocalReports();
      try {
        const response = await fetch("/api/reports", {
          cache: "no-store",
          headers: await getAuthHeaders(),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "저장 리포트를 불러오지 못했습니다.");

        if (!ignore) {
          setReports([...(payload.reports ?? []), ...localReports]);
        }
      } catch (error) {
        if (!ignore) {
          setReports(localReports);
          setError(
            error instanceof Error
              ? `서버 저장 목록을 불러오지 못해 로컬 리포트만 표시합니다. ${error.message}`
              : "서버 저장 목록을 불러오지 못해 로컬 리포트만 표시합니다.",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadReports();
    return () => {
      ignore = true;
    };
  }, []);

  const companyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const report of reports) {
      if (!report.top_company) continue;
      counts.set(report.top_company, (counts.get(report.top_company) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [reports]);

  function openLocalReport(report: LocalReport) {
    sessionStorage.setItem("nextpost:last-result", JSON.stringify(report.result_payload));
    sessionStorage.setItem("nextpost:last-input", JSON.stringify(report.input_payload ?? {}));
    router.push("/results");
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="np-image-nav text-white">
        <div className="page-shell flex items-center py-5 md:py-7">
          <Link className="text-[20px] font-black tracking-[1px] drop-shadow md:text-[22px]" href="/">
            NEXTPOST
          </Link>
          <nav className="ml-auto flex items-center gap-3 text-xs font-extrabold drop-shadow md:gap-5 md:text-sm">
            <Link href="/analyze">새 분석</Link>
            <Link className="hidden sm:inline" href="/about">About</Link>
            <AuthMenu compact />
          </nav>
        </div>

        <section className="page-shell pb-9 pt-5 md:pb-14 md:pt-8">
          <h1 className="max-w-3xl text-[42px] font-black leading-tight tracking-normal md:text-7xl">
            MY NEXTPOST
          </h1>
        </section>
      </header>

      <section className="page-shell py-7 md:py-10">
        {error ? (
          <div className="mb-5 rounded-[12px] border border-[#F0C2C2] bg-[#FFF2F2] px-4 py-3 text-sm font-bold text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <MetricCard label="저장 리포트" value={`${reports.length}개`} />
          <MetricCard label="관심 기업" value={`${companyCounts.length}개`} />
          <MetricCard label="평균 적합도" value={`${averageScore(reports) || "-"}${averageScore(reports) ? "점" : ""}`} />
          <MetricCard label="최근 분석" value={reports[0] ? formatDate(reports[0].created_at) : "-"} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.65fr_0.35fr]">
          <section className="np-card p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black tracking-normal md:text-2xl">내 리포트</h2>
              <Link
                className="focus-ring inline-flex h-9 items-center rounded-[9px] bg-[var(--accent)] px-3 text-xs font-black text-white md:h-10 md:px-4 md:text-sm"
                href="/analyze"
              >
                새 분석
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {isLoading ? (
                <div className="flex items-center gap-2 rounded-[12px] bg-[#F8FAFB] p-4 text-sm font-bold text-[var(--caption)]">
                  <Loader2 className="animate-spin" size={16} />
                  저장 리포트를 불러오는 중입니다.
                </div>
              ) : reports.length ? (
                reports.map((report) => (
                  <article
                    className="rounded-[14px] border border-[var(--border)] bg-white p-3 md:p-4"
                    key={`${report.local_only ? "local" : "server"}-${report.id}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black md:text-lg">{report.title}</p>
                        <p className="mt-1 text-xs font-bold text-[var(--caption)] md:text-sm">
                          {[report.matched_field, report.matched_job_group, formatDate(report.created_at)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-black",
                          report.local_only
                            ? "bg-[#FFF7E8] text-[#7A4A00]"
                            : "bg-[#E9F6EF] text-[var(--success)]",
                        )}
                      >
                        {report.local_only ? "로컬 저장" : "공유 가능"}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3 md:mt-4">
                      <SmallStat label="추천 1순위" value={report.top_company ?? "정보 없음"} />
                      <SmallStat
                        label="적합도"
                        value={report.top_score ? `${report.top_score}점` : "정보 없음"}
                      />
                      <SmallStat label="생성일" value={formatDate(report.created_at)} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {report.local_only ? (
                        <button
                          className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] px-3 text-xs font-black md:h-10 md:px-4 md:text-sm"
                          type="button"
                          onClick={() => openLocalReport(report)}
                        >
                          리포트 열기
                        </button>
                      ) : (
                        <Link
                          className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] px-3 text-xs font-black md:h-10 md:px-4 md:text-sm"
                          href={`/reports/${report.share_id}`}
                        >
                          공유 리포트 열기
                          <ExternalLink size={15} />
                        </Link>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[14px] border border-dashed border-[var(--border)] bg-white p-6 text-center md:p-8">
                  <p className="text-lg font-black">아직 저장된 리포트가 없습니다</p>
                  <p className="mt-2 text-sm font-bold text-[var(--caption)]">
                    분석 결과 화면에서 리포트 저장을 누르면 이곳에 쌓입니다.
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="np-card p-4 md:p-6">
            <h2 className="text-xl font-black tracking-normal md:text-2xl">관심 기업</h2>
            <div className="mt-5 grid gap-3">
              {companyCounts.length ? (
                companyCounts.map(([company, count], index) => (
                  <div
                    className="flex items-center justify-between rounded-[12px] bg-[#F8FAFB] px-4 py-3"
                    key={company}
                  >
                    <div>
                      <p className="font-black">{company}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--caption)]">
                        저장 리포트 {count}건에서 추천
                      </p>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--primary)] text-sm font-black text-white">
                      {index + 1}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-[12px] bg-[#F8FAFB] p-4 text-sm font-bold leading-6 text-[var(--caption)]">
                  저장 리포트가 생기면 추천 1순위 기업을 기준으로 관심 기업이 자동 정리됩니다.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function readLocalReports() {
  try {
    return JSON.parse(localStorage.getItem("nextpost:saved-reports") || "[]") as LocalReport[];
  } catch {
    return [];
  }
}

function averageScore(reports: DashboardReport[]) {
  const scores = reports
    .map((report) => report.top_score)
    .filter((score): score is number => typeof score === "number");
  if (!scores.length) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="np-card p-4 md:p-5">
      <p className="text-xs font-extrabold text-[var(--caption)] md:text-sm">{label}</p>
      <p className="mt-2 break-words text-2xl font-black tracking-normal md:mt-3 md:text-3xl">{value}</p>
    </article>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#F8FAFB] px-3 py-2">
      <p className="text-xs font-black text-[var(--caption)]">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}
