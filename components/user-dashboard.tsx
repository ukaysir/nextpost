"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Share2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthMenu } from "@/components/auth-menu";
import { getAuthHeaders } from "@/lib/auth-client";
import { AnalysisResult } from "@/lib/types";

type ServerReport = {
  id: string;
  share_id: string;
  title: string;
  created_at: string;
  local_only?: false;
};

type LocalReport = {
  id: string;
  share_id: "";
  title: string;
  input_payload: Record<string, unknown>;
  result_payload: AnalysisResult;
  created_at: string;
  local_only: true;
};

type DashboardReport = ServerReport | LocalReport;

export function UserDashboard() {
  const router = useRouter();
  const [reports, setReports] = useState<DashboardReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const latestReport = reports[0];

  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      setIsLoading(true);
      setMessage("");

      const localReports = readLocalReports();
      try {
        const response = await fetch("/api/reports", {
          cache: "no-store",
          headers: await getAuthHeaders(),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "저장 리포트를 불러오지 못했습니다.");

        if (!ignore) {
          setReports([...(payload.reports ?? []), ...localReports].sort(sortByCreatedAt));
        }
      } catch (error) {
        if (!ignore) {
          setReports(localReports.sort(sortByCreatedAt));
          setMessage(
            error instanceof Error
              ? `서버 저장 목록을 불러오지 못했습니다. ${error.message}`
              : "서버 저장 목록을 불러오지 못했습니다.",
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

  function openLocalReport(report: LocalReport) {
    sessionStorage.setItem("nextpost:last-result", JSON.stringify(report.result_payload));
    sessionStorage.setItem("nextpost:last-input", JSON.stringify(report.input_payload ?? {}));
    router.push("/results");
  }

  async function deleteReport(report: DashboardReport) {
    if (report.local_only) {
      const nextReports = reports.filter((item) => item.id !== report.id);
      localStorage.setItem(
        "nextpost:saved-reports",
        JSON.stringify(nextReports.filter((item): item is LocalReport => Boolean(item.local_only))),
      );
      setReports(nextReports);
      setSelectedId("");
      setMessage("리포트를 삭제했습니다.");
      return;
    }

    const response = await fetch("/api/reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({ id: report.id }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.message || "리포트를 삭제하지 못했습니다.");
      return;
    }

    setReports((current) => current.filter((item) => item.id !== report.id));
    setSelectedId("");
    setMessage("리포트를 삭제했습니다.");
  }

  async function shareReport(report: DashboardReport) {
    if (report.local_only) {
      setMessage("로컬 리포트는 리포트를 연 뒤 저장하면 공유할 수 있습니다.");
      return;
    }

    const url = new URL(`/reports/${report.share_id}`, window.location.origin).href;
    if (navigator.share) {
      await navigator.share({ title: "NEXTPOST 리포트", url });
    } else {
      await navigator.clipboard.writeText(url);
      setMessage("공유 링크를 복사했습니다.");
    }
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
        {message ? (
          <div className="mb-5 rounded-[12px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-bold text-[var(--caption)]">
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <MetricCard label="저장된 리포트 개수" value={`${reports.length}개`} />
          <MetricCard label="최근 분석일" value={latestReport ? formatDate(latestReport.created_at) : "-"} />
        </div>

        <section className="mt-5">
          <div className="grid gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-[12px] border border-[var(--border)] bg-white p-4 text-sm font-bold text-[var(--caption)]">
                <Loader2 className="animate-spin" size={16} />
                저장 리포트를 불러오는 중입니다.
              </div>
            ) : reports.length ? (
              reports.map((report) => {
                const selected = selectedId === report.id;
                return (
                  <article
                    className="rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgba(20,40,38,0.045)]"
                    key={`${report.local_only ? "local" : "server"}-${report.id}`}
                    onClick={() => setSelectedId(selected ? "" : report.id)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-base font-black text-[var(--foreground)]">
                        리포트 생성일자 {formatDate(report.created_at)}
                      </p>
                      {report.local_only ? (
                        <button
                          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-[#252C36] px-4 text-sm font-black text-white"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openLocalReport(report);
                          }}
                        >
                          리포트 열기
                          <ExternalLink size={16} />
                        </button>
                      ) : (
                        <Link
                          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-[#252C36] px-4 text-sm font-black text-white"
                          href={`/reports/${report.share_id}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          리포트 열기
                          <ExternalLink size={16} />
                        </Link>
                      )}
                    </div>

                    {selected ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                        <button
                          className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[#efcaca] bg-white px-3 text-xs font-black text-[var(--danger)]"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteReport(report);
                          }}
                        >
                          <Trash2 size={15} />
                          삭제
                        </button>
                        <button
                          className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] bg-white px-3 text-xs font-black text-[#252C36]"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void shareReport(report);
                          }}
                        >
                          <Share2 size={15} />
                          공유
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="rounded-[14px] border border-dashed border-[var(--border)] bg-white p-6 text-center md:p-8">
                <p className="text-lg font-black">아직 저장된 리포트가 없습니다</p>
              </div>
            )}
          </div>
        </section>
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

function sortByCreatedAt(a: DashboardReport, b: DashboardReport) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="np-card p-4 md:p-5">
      <p className="text-xs font-extrabold text-[var(--caption)] md:text-sm">{label}</p>
      <p className="mt-2 break-words text-2xl font-black tracking-normal md:mt-3 md:text-3xl">{value}</p>
    </article>
  );
}
