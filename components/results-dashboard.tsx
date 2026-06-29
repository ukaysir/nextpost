"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  GraduationCap,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  Send,
  Target,
  type LucideIcon,
} from "lucide-react";
import { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthMenu } from "@/components/auth-menu";
import { getAuthHeaders } from "@/lib/auth-client";

const DataChat = dynamic(
  () => import("@/components/data-chat").then((mod) => mod.DataChat),
  {
    loading: () => (
      <div className="np-card grid h-[420px] place-items-center p-6 text-center">
        <Loader2 className="mx-auto animate-spin text-[var(--primary)]" size={30} />
        <p className="mt-3 text-sm font-bold text-[var(--caption)]">AI 상담을 준비하고 있습니다.</p>
      </div>
    ),
    ssr: false,
  },
);

type ResultPayload = AnalysisResult & {
  ai_provider?: "openai" | "fallback";
};

type CompanyDetail = NonNullable<AnalysisResult["company_details"]>[number];
type JobMatch = NonNullable<AnalysisResult["job_cards"]>[number];
type RecommendedCompany = AnalysisResult["recommended_companies"][number];

export function ResultsDashboard({
  initialResult,
  readOnly = false,
  savedReportShareId,
}: {
  initialResult?: ResultPayload;
  readOnly?: boolean;
  savedReportShareId?: string;
}) {
  const [result, setResult] = useState<ResultPayload | null>(initialResult ?? null);
  const [toast, setToast] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [savedSharePath, setSavedSharePath] = useState(
    savedReportShareId ? `/reports/${savedReportShareId}` : "",
  );

  useEffect(() => {
    if (initialResult) return;
    const raw = sessionStorage.getItem("nextpost:last-result");
    if (raw) window.setTimeout(() => setResult(JSON.parse(raw)), 0);
  }, [initialResult]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  const topScore = useMemo(() => result?.recommended_companies?.[0]?.fit_score ?? 0, [result]);
  const dischargeRecommendsLater = useMemo(
    () => Boolean(result && recommendsLaterDischarge(result.discharge_timing.recommendation)),
    [result],
  );
  const detailByCompany = useMemo(() => {
    return new Map((result?.company_details ?? []).map((detail) => [detail.company_name, detail]));
  }, [result?.company_details]);
  const evidenceByCompany = useMemo(() => {
    return new Map((result?.recommendation_evidence ?? []).map((item) => [item.company_name, item]));
  }, [result?.recommendation_evidence]);
  const reportUrl =
    typeof window !== "undefined"
      ? savedSharePath
        ? new URL(savedSharePath, window.location.origin).href
        : window.location.href
      : "";

  async function saveReport() {
    if (!result || isSaving || readOnly) return;
    setIsSaving(true);

    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(sessionStorage.getItem("nextpost:last-input") || "{}");
    } catch {
      input = {};
    }

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ input, result }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "리포트를 저장하지 못했습니다.");

      const sharePath = payload.shareUrl as string;
      setSavedSharePath(sharePath);
      const absoluteUrl = new URL(sharePath, window.location.origin).href;
      await navigator.clipboard.writeText(absoluteUrl);
      showToast("리포트를 저장하고 공유 링크를 복사했습니다.");
    } catch (error) {
      saveReportLocally(result, input);
      showToast(
        error instanceof Error
          ? `서버 저장 실패, 브라우저에 임시 저장했습니다: ${error.message}`
          : "서버 저장 실패, 브라우저에 임시 저장했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <section className="np-card max-w-md p-6 text-center md:p-8">
          <Target className="mx-auto text-[var(--primary)]" size={38} />
          <h1 className="mt-5 text-2xl font-black">분석 결과가 없습니다</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            군 경력 정보를 입력하면 방산 커리어 리포트를 확인할 수 있습니다.
          </p>
          <Link
            className="focus-ring mt-6 inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--accent)] px-5 font-black text-white"
            href="/analyze"
          >
            분석하러 가기
          </Link>
        </section>
      </main>
    );
  }

  const mobileTabs = [
    { href: "#report-summary", label: "요약" },
    { href: "#report-companies", label: "추천기업" },
    { href: "#report-skills", label: "준비도" },
    { href: "#report-chat", label: "AI상담" },
  ];

  return (
    <main className="min-h-screen bg-[#e9edf3]">
      <header className="np-image-nav sticky top-0 z-30 border-b border-white/10 text-white no-print">
        <div className="page-shell flex items-center py-4 md:py-5">
          <Link className="text-lg font-black tracking-[1px] md:text-xl" href="/">
            NEXTPOST
          </Link>
          <nav className="ml-auto flex items-center gap-3 text-xs font-extrabold md:gap-5 md:text-sm">
            <Link href="/analyze">다시 입력</Link>
            <a className="hidden sm:inline" href="mailto:?subject=NEXTPOST 리포트&body=NEXTPOST 분석 리포트 링크를 공유합니다.">
              공유
            </a>
            <AuthMenu compact />
          </nav>
        </div>
      </header>

      {toast ? (
        <div className="fixed bottom-5 left-3 right-3 z-50 rounded-[11px] bg-[#191F28] px-4 py-3 text-center text-sm font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,.28)] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-5">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto max-w-[1380px] px-4 py-6 md:px-5 md:py-10">
        <div className="mx-auto mb-5 grid gap-2 no-print xl:grid-cols-[minmax(0,920px)_minmax(340px,420px)] xl:items-center xl:justify-center">
          <Link
            className="focus-ring inline-flex h-10 w-fit items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] bg-white px-3 text-sm font-extrabold text-[var(--caption)]"
            href="/analyze"
          >
            <ArrowLeft size={16} />
            다시 입력하기
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-start">
            {!readOnly ? (
              <ActionButton
                icon={Save}
                label={isSaving ? "저장 중" : savedSharePath ? "저장 완료" : "리포트 저장"}
                onClick={saveReport}
                busy={isSaving}
                done={Boolean(savedSharePath)}
                primary={!savedSharePath}
              />
            ) : null}
            <ActionButton
              icon={Copy}
              label="링크 복사"
              doneLabel="복사 완료"
              onClick={async () => {
                await navigator.clipboard.writeText(reportUrl);
                showToast("리포트 링크를 복사했습니다.");
              }}
            />
            <ActionButton icon={Download} label="PDF 저장" doneLabel="PDF 준비" onClick={() => window.print()} />
            <ActionButton
              icon={Mail}
              label="메일"
              doneLabel="메일 열림"
              onClick={() => {
                window.location.href = `mailto:?subject=NEXTPOST 리포트&body=${encodeURIComponent(reportUrl)}`;
              }}
            />
            <ActionButton
              icon={Send}
              label="전송"
              pendingLabel="전송 중"
              doneLabel="전송 완료"
              primary
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({ title: "NEXTPOST 리포트", url: reportUrl });
                } else {
                  await navigator.clipboard.writeText(reportUrl);
                  showToast("공유 기능 대신 링크를 복사했습니다.");
                }
              }}
            />
          </div>
        </div>

        <nav className="no-print sticky top-[57px] z-20 -mx-4 mb-5 flex gap-2 overflow-x-auto border-y border-[#dce3ee] bg-[#e9edf3] px-4 py-2 sm:hidden">
          {mobileTabs.map((tab) => (
            <a
              className="shrink-0 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-black text-[var(--muted-foreground)]"
              href={tab.href}
              key={tab.href}
            >
              {tab.label}
            </a>
          ))}
        </nav>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,920px)_minmax(340px,420px)] xl:items-start xl:justify-center">
          <div className="min-w-0">
            <article className="space-y-6">
              <section className="scroll-mt-28" id="report-summary">
                <h1 className="mb-7 text-[34px] font-extrabold leading-[1.25] tracking-[-0.02em] text-[#1d2533] md:text-[50px]">
                  <span className="text-[#15316f] md:text-[60px]">MY</span>
                  <span className="text-[28px] font-bold text-[#46506a] md:text-[34px]"> 방산 커리어 분석</span>
                </h1>
                <div className="rounded-[20px] bg-white shadow-[0_8px_30px_-16px_rgba(40,55,80,.25)]">
                  <div className="border-b border-[#eaeef4] bg-[#f4f6fa] px-5 py-5 md:px-[26px]">
                    <h2 className="text-[30px] font-extrabold leading-tight text-[#1d2533] md:text-[40px]">
                      군경력 번역
                    </h2>
                    <p className="mt-[3px] text-[13px] font-normal leading-normal text-[#6b7890]">
                      군 보직·경력을 방산업계가 이해하는 직무역량 언어로 변환합니다. 이력서·자기소개서에 바로 사용하세요.
                    </p>
                  </div>
                  <div className="grid gap-5 px-5 py-6 md:grid-cols-[1fr_180px] md:items-start md:px-[26px]">
                  <div>
                    <p className="mb-1.5 text-[22px] font-extrabold text-[#15316f]">
                      군 경력 요약
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#6b7890]">
                      {result.matched_field} · {result.matched_job_group}
                    </p>
                    <ReadableText
                      className="mt-3 text-[15px] font-medium leading-8 text-[#34405a]"
                      text={result.skill_translation.summary}
                    />
                    <div className="mt-[22px]">
                      <p className="mb-1.5 text-[22px] font-extrabold text-[#15316f]">이력서 활용가능 키워드</p>
                      <p className="mt-2 text-[13.5px] leading-7 text-[#6b7890]">
                        <b className="text-[14.5px] text-[#1d2533]">
                          군 보직 용어를 방산 채용담당자가 곧바로 이해하는 직무역량 언어로 바꾼 키워드입니다.
                        </b>
                        <br />
                        이력서·자기소개서·경력기술서에 그대로 옮겨 적으면 직무 적합성이 분명하게 드러납니다.
                      </p>
                      <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                        {result.skill_translation.keywords.slice(0, 8).map((keyword) => (
                          <KeywordCard keyword={keyword} key={keyword} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-[#e9edf4] bg-[#fbfcfe] p-4 text-center">
                    <p className="text-xs font-extrabold text-[#6b7890]">최상위 기업 적합도</p>
                    <p className="mt-2 text-[54px] font-extrabold leading-none text-[#1d2533]">
                      {topScore}
                    </p>
                    <p className="mt-2 text-xs font-extrabold text-[#8a96ab]">점</p>
                  </div>
                </div>
                </div>

              </section>

              <Divider />

              <ReportSection
                icon={BriefcaseBusiness}
                id="report-companies"
                title="추천 기업 List"
                description="경력·전공·희망분야 기준 적합도가 높은 순으로 방산기업을 추천합니다. 추천사유·직무·기업정보·채용링크를 함께 확인하세요."
              >
                <div className="grid gap-4">
                  <div>
                    <p className="text-[22px] font-extrabold text-[#15316f]">추천 직무</p>
                    <p className="mt-1 text-[13px] leading-6 text-[#6b7890]">
                      경력·전공·역량을 종합한 적합 직무입니다. 아래 직무 기준으로 기업을 추천했습니다.
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {(result.job_cards ?? []).map((job) => (
                        <JobMatchCard job={job} key={job.job_title} />
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-[#eef1f6]" />

                  {result.recommended_companies.map((company) => {
                    const detail = detailByCompany.get(company.company_name);
                    const evidence = evidenceByCompany.get(company.company_name);

                    return (
                      <CompanyCard
                        company={company}
                        detail={detail}
                        evidence={evidence?.evidence_points ?? []}
                        key={company.company_name}
                      />
                    );
                  })}
                  <p className="text-[11.5px] leading-5 text-[#9aa6ba]">
                    ※ 기업 재무·연봉 수치는 공개 데이터와 수집된 원천 기준이며 실제와 차이가 있을 수 있습니다.
                  </p>
                </div>
              </ReportSection>

              <Divider />

              <ReportSection
                icon={Target}
                id="report-skills"
                title="Skill Gap 분석"
                description="보유 역량과 목표 직무가 요구하는 부족 역량을 비교해 보완 우선순위를 도출합니다."
              >
                <div className="grid gap-[18px] md:grid-cols-2">
                  <SkillBarList
                    accent="#3d5a9a"
                    details={result.skill_gap.possessed_details}
                    fallbackItems={result.skill_gap.possessed}
                    title="보유 역량"
                  />
                  <SkillBarList
                    accent="#c47f3d"
                    details={result.skill_gap.missing_details}
                    fallbackItems={result.skill_gap.missing}
                    title="부족 역량"
                  />
                </div>
                <div className="mt-[18px] rounded-[14px] p-[20px_22px]">
                  <p className="mb-2.5 inline-flex rounded-[6px] bg-white px-2.5 py-1 text-[20px] font-extrabold text-[#3d5a9a]">* 종합 진단</p>
                  <ReadableText
                    className="text-[14.5px] font-bold leading-[1.7] text-[#333]"
                    text={result.skill_gap.analysis}
                  />
                </div>
              </ReportSection>

              <Divider />

              <ReportSection
                icon={GraduationCap}
                title="교육 · 자격증 로드맵"
                description="부족 역량을 채우기 위한 공공·전문 교육과정을 입문→중급→심화 단계로 제안합니다."
              >
                <div className="grid gap-3.5 md:grid-cols-3">
                  {buildRoadmapGroups(result).map((group, index) => {
                    const href = group.items[0]?.education_link ?? "#";
                    return (
                    <article
                      className="flex min-h-[210px] flex-col rounded-[14px] border border-[#eef1f6] p-[18px] transition hover:border-[#3d5a9a]"
                      key={group.level}
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <span className={cn(
                          "grid h-[26px] w-[26px] place-items-center rounded-full text-[13px] font-extrabold",
                          index >= 2 ? "bg-[#2a3342] text-white" : "bg-[#eef2fb] text-[#3d5a9a]",
                        )}>
                          {index + 1}
                        </span>
                        <span className="text-[15px] font-extrabold text-[#1d2533]">{group.level}</span>
                      </div>
                      <ul className="mb-4 grid gap-[9px]">
                        {group.items.slice(0, 3).map((item) => (
                          <li className="text-[13.5px] leading-[1.5] text-[#3a4762]" key={item.education_name}>
                            <b className="text-[#1d2533]">{item.education_name}</b>
                            <br />
                            <span className="text-xs text-[#8a96ab]">
                              {[item.education_provider, item.cert_name].filter(Boolean).join(" · ") || item.job_title || "추천 과정"}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <a
                        className={cn(
                          "mt-auto inline-flex h-10 items-center justify-center rounded-[10px] px-3 text-[13px] font-bold",
                          index >= 2 ? "bg-[#2a3342] text-white" : "bg-[#eef2fb] text-[#3d5a9a]",
                        )}
                        href={href}
                        rel="noreferrer"
                        target="_blank"
                      >
                          강좌 알아보기
                      </a>
                    </article>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Award size={18} className="text-[var(--warning)]" />
                  {result.recommended_certs.map((cert) => (
                    <span className="np-pill px-3 py-1" key={cert}>
                      {cert}
                    </span>
                  ))}
                </div>
              </ReportSection>

              <Divider />

              <ReportSection
                icon={RotateCcw}
                title="전역 시기 조언"
                description="지금 전역과 1~2년 추가 복무 시의 방산 취업 적합도·유리도를 비교해 의사결정을 돕습니다."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TimingCard
                    recommended={!dischargeRecommendsLater}
                    title="지금 전역"
                    body={result.discharge_timing.now}
                    details={result.discharge_timing.now_details}
                  />
                  <TimingCard
                    recommended={dischargeRecommendsLater}
                    title="추가 복무"
                    body={result.discharge_timing.later}
                    details={result.discharge_timing.later_details}
                  />
                </div>
                <div className="mt-[22px]">
                  <p className="mb-2 text-[20px] font-extrabold text-[#2e8b6f]">* 추천</p>
                  <ReadableText
                    className="text-[14.5px] font-normal leading-[1.7] text-[#34405a]"
                    text={result.discharge_timing.recommendation}
                  />
                </div>
              </ReportSection>

            </article>
          </div>

          <aside className="no-print min-h-0 scroll-mt-28 xl:sticky xl:top-[92px] xl:pt-[84px]" id="report-chat">
            {isChatOpen ? (
              <DataChat
                analysisResult={result}
                className="mt-6 h-[620px] min-h-[500px] xl:mt-0 xl:h-[calc(100dvh-272px)]"
              />
            ) : (
              <section className="mt-6 rounded-[20px] bg-white p-5 shadow-[0_8px_30px_-16px_rgba(40,55,80,.25)] xl:mt-0">
                <p className="text-sm font-black text-[var(--primary)]">NEXTPOST AI 상담</p>
                <h2 className="mt-2 text-xl font-black">리포트 기준으로 질문하기</h2>
                <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  추천 기업, 직무 역량, 교육 로드맵을 이어서 확인할 수 있습니다.
                </p>
                <button
                  className="focus-ring mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-[#252C36] px-4 text-sm font-black text-white"
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                >
                  <Send size={17} />
                  AI 상담 열기
                </button>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function saveReportLocally(result: ResultPayload, input: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const key = "nextpost:saved-reports";
  const topCompany = result.recommended_companies?.[0];
  const item = {
    id: `local-${Date.now()}`,
    share_id: "",
    title: `${result.matched_field ?? "방산"} · ${topCompany?.company_name ?? "추천"} 리포트`,
    input_payload: input,
    result_payload: result,
    matched_field: result.matched_field ?? null,
    matched_job_group: result.matched_job_group ?? null,
    top_company: topCompany?.company_name ?? null,
    top_score: topCompany?.fit_score ?? null,
    created_at: new Date().toISOString(),
    local_only: true,
  };

  try {
    const current = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown[];
    window.localStorage.setItem(key, JSON.stringify([item, ...current].slice(0, 20)));
  } catch {
    window.localStorage.setItem(key, JSON.stringify([item]));
  }
}

function buildRoadmapGroups(result: ResultPayload) {
  const preferredLevels = ["입문", "중급", "심화"];
  const groups = result.education_groups?.length
    ? result.education_groups
    : preferredLevels.map((level) => ({
        level,
        items: result.education_roadmap
          .filter((item) => item.level === level)
          .map((item) => ({
            education_name: item.education_name,
            education_provider: null,
            education_link: item.education_link,
            cert_name: null,
            job_title: item.reason,
            defense_field: result.matched_field ?? null,
          })),
      }));

  return preferredLevels
    .map((level) => {
      const group = groups.find((item) => item.level === level);
      if (group?.items.length) return group;
      const fallback = result.education_roadmap.find((item) => item.level === level) ?? result.education_roadmap[0];
      return {
        level,
        items: fallback
          ? [
              {
                education_name: fallback.education_name,
                education_provider: null,
                education_link: fallback.education_link,
                cert_name: null,
                job_title: fallback.reason,
                defense_field: result.matched_field ?? null,
              },
            ]
          : [],
      };
    })
    .filter((group) => group.items.length > 0);
}

function recommendsLaterDischarge(value: string) {
  return /추가\s*복무|더\s*복무|6\s*~?\s*12\s*개월|1\s*~?\s*2\s*년|이후|준비\s*후|보완\s*후/.test(value);
}

function CompanyCard({
  company,
  detail,
  evidence,
}: {
  company: RecommendedCompany;
  detail?: CompanyDetail;
  evidence: string[];
}) {
  const homepageUrl = detail?.homepage_url;
  const careerUrl = detail?.careers_page_url ?? company.careers_page_url;
  const latestRevenue = detail?.financials?.[0]?.revenue;

  return (
    <article className="rounded-[16px] border border-[#e9edf4] bg-white p-5">
      <div className="grid gap-5 md:grid-cols-[96px_1fr]">
        <FitGauge score={company.fit_score} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-extrabold leading-tight text-[#1d2533]">{company.company_name}</h3>
            {company.defense_field ? (
              <span className="rounded-full bg-[#eef2fb] px-2.5 py-1 text-xs font-extrabold text-[#3d5a9a]">
                {company.defense_field}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-[14px] leading-[1.6] text-[#4b5870]">
            <b className="text-[#2a3342]">추천직무</b> · {company.recommended_positions.slice(0, 2).join(", ") || "채용 페이지 확인"}
          </p>
          <div className="mb-3.5 mt-1 text-[14px] leading-[1.6] text-[#4b5870]">
            <b className="text-[#2a3342]">추천사유</b> ·{" "}
            <ReadableText className="inline text-[14px] leading-[1.6] text-[#4b5870]" text={company.reason} />
          </div>

          <div className="mb-3.5 grid gap-2.5 sm:grid-cols-4">
            <MetricBox label="방산 수주잔고" value={formatMoney(company.total_contract_amount)} />
            <MetricBox label="매출" value={formatMoney(latestRevenue)} />
            <MetricBox label="평균연봉" value={formatSalary(company.avg_salary)} />
          </div>

          <div className="flex flex-wrap gap-2.5">
            {homepageUrl ? (
              <ExternalButton href={homepageUrl} label="공식 홈페이지" />
            ) : null}
            {careerUrl ? <ExternalButton href={careerUrl} label="채용 페이지" /> : null}
          </div>

          <details className="group mt-4 rounded-[14px] border border-[var(--border)] bg-[#FAFBFC]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-black">
              <span>공개 데이터 근거</span>
              <ChevronDown
                className="text-[var(--caption)] transition-transform group-open:rotate-180"
                size={18}
              />
            </summary>
            <div className="grid gap-3 border-t border-[var(--border)] p-3 md:p-4">
              {evidence.length ? <EvidenceList evidence={evidence} /> : null}
              <JobSignalList postings={detail?.job_postings ?? []} />
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function EvidenceList({ evidence }: { evidence: string[] }) {
  return (
    <div className="rounded-[12px] bg-white p-4">
      <p className="text-sm font-black text-[var(--primary)]">공개 데이터 근거</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {evidence.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function JobSignalList({ postings }: { postings: CompanyDetail["job_postings"] }) {
  return (
    <section>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-black">
        <BriefcaseBusiness size={16} className="text-[var(--primary)]" />
        채용 신호
      </h4>
      <div className="grid gap-2">
        {postings.length ? (
          postings.map((posting, index) => (
            <article className="rounded-[12px] bg-white p-3" key={`${posting.title}-${index}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black leading-6">{posting.title}</p>
                {posting.posting_url ? <ExternalButton href={posting.posting_url} label="공고" compact /> : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                {posting.job_function ?? "직무 상세 미확보"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  posting.employment_type,
                  posting.experience_level,
                  posting.location,
                  posting.deadline_at ? `마감 ${formatDate(posting.deadline_at)}` : null,
                  posting.is_active === false ? "과거/참고" : null,
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <span className="rounded-full bg-[#F4F6F8] px-2.5 py-1 text-xs font-bold text-[var(--caption)]" key={item}>
                      {item}
                    </span>
                  ))}
              </div>
              {posting.required_skills?.length || posting.preferred_skills?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...(posting.required_skills ?? []), ...(posting.preferred_skills ?? [])].slice(0, 8).map((skill) => (
                    <span className="rounded-full bg-[#EEF4FA] px-2.5 py-1 text-xs font-bold text-[#506580]" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <EmptyText text="기업별 채용 신호가 없습니다." />
        )}
      </div>
    </section>
  );
}

function Divider() {
  return null;
}

function ReportSection({
  children,
  description,
  icon: Icon,
  id,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  icon: LucideIcon;
  id?: string;
  title: string;
}) {
  void Icon;

  return (
    <section
      className="scroll-mt-28 overflow-hidden rounded-[20px] bg-white shadow-[0_8px_30px_-16px_rgba(40,55,80,.25)]"
      id={id}
    >
      <div className="flex items-center gap-3 border-b border-[#eaeef4] bg-[#f4f6fa] px-5 py-5 md:px-[26px]">
        <div>
          <h2 className="text-[30px] font-extrabold leading-tight text-[#1d2533] md:text-[40px]">
            {title}
          </h2>
          {description ? (
            <p className="mt-[3px] text-[13px] font-normal leading-normal text-[#6b7890]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-6 md:px-[26px]">{children}</div>
    </section>
  );
}

function KeywordCard({ keyword }: { keyword: string }) {
  return (
    <div className="flex min-h-[46px] items-baseline gap-2.5 rounded-[10px] border border-[#e9edf4] bg-[#fbfcfe] px-3.5 py-[11px]">
      <span className="shrink-0 text-[13px] font-bold text-[#2b3a5c]">{formatSkillPillText(keyword)}</span>
      <span className="min-w-0 text-[12.5px] font-normal leading-[1.45] text-[#7c8aa3]">
        방산 직무 역량으로 활용 가능한 키워드
      </span>
    </div>
  );
}

function ActionButton({
  busy = false,
  done = false,
  icon: Icon,
  label,
  onClick,
  pendingLabel,
  doneLabel,
  primary,
}: {
  busy?: boolean;
  done?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void | Promise<void>;
  pendingLabel?: string;
  doneLabel?: string;
  primary?: boolean;
}) {
  const [feedback, setFeedback] = useState<"idle" | "pending" | "done">("idle");
  const isBusy = busy || feedback === "pending";
  const isDone = done || feedback === "done";
  const visibleLabel = isBusy ? (pendingLabel ?? "처리 중") : isDone ? (doneLabel ?? label) : label;

  async function handleClick() {
    if (isBusy) return;
    setFeedback("pending");
    try {
      await onClick();
      setFeedback("done");
      window.setTimeout(() => setFeedback("idle"), 1400);
    } catch (error) {
      setFeedback("idle");
      throw error;
    }
  }

  return (
    <button
      className={cn(
        "focus-ring inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-[9px] px-3 text-sm font-extrabold transition duration-150 active:scale-[0.97]",
        "shadow-[0_1px_0_rgba(15,23,42,.04)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(15,23,42,.10)]",
        primary || isDone
          ? "bg-[var(--accent)] text-white"
          : "border border-[var(--border)] bg-white text-[var(--caption)] hover:border-[var(--primary)] hover:text-[var(--foreground)]",
        isBusy ? "cursor-wait opacity-80" : "",
      )}
      aria-busy={isBusy}
      aria-live="polite"
      disabled={isBusy}
      type="button"
      onClick={handleClick}
    >
      {isBusy ? (
        <Loader2 className="animate-spin" size={16} />
      ) : isDone ? (
        <CheckCircle2 size={16} />
      ) : (
        <Icon size={16} />
      )}
      {visibleLabel}
    </button>
  );
}

function JobMatchCard({ job }: { job: JobMatch }) {
  const skills = job.required_skills.map(formatSkillPillText).filter(Boolean);
  const visibleSkills = skills.slice(0, 4);
  const hiddenSkillCount = Math.max(skills.length - visibleSkills.length, 0);
  const relatedWeaponSystem = job.related_weapon_system?.trim();
  const fitLabel = job.fit_label ?? "적합";
  const labelClass =
    fitLabel === "최적합"
      ? "bg-[#3d5a9a]"
      : fitLabel === "검토"
        ? "bg-[#8a96ab]"
        : "bg-[#5b6b87]";

  return (
    <article className="flex min-h-[150px] flex-col rounded-[14px] border border-[#e9edf4] bg-[#fbfcfe] p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={cn("rounded-[6px] px-[9px] py-[3px] text-[11px] font-extrabold text-white", labelClass)}>
              {fitLabel}
            </span>
            <h3 className="break-keep text-[15px] font-extrabold leading-6 text-[#1d2533]">
              {job.job_title}
            </h3>
          </div>
          {job.fit_score ? (
            <span className="shrink-0 text-xs font-extrabold text-[#3d5a9a]">
              {job.fit_score}점
            </span>
          ) : null}
        </div>
        <div className="mt-2 min-h-6">
          {relatedWeaponSystem ? (
            <span className="inline-flex max-w-full rounded-full bg-[#eef2fb] px-3 py-1 text-xs font-extrabold leading-4 text-[#3d5a9a]">
              <span className="truncate">{relatedWeaponSystem}</span>
            </span>
          ) : null}
        </div>
      </div>

      {job.match_reason ? (
        <p className="mt-2 text-[13px] font-normal leading-[1.55] text-[#6b7890]">
          {job.match_reason}
        </p>
      ) : job.preferred_military_exp ? (
        <ReadableText
          className="mt-2 text-[13px] leading-[1.55] text-[#6b7890]"
          text={job.preferred_military_exp}
        />
      ) : null}

      <div className="mt-auto flex content-start flex-wrap gap-2 pt-3">
        {visibleSkills.map((skill, index) => (
          <span
            className="max-w-full rounded-full bg-white px-3 py-1 text-xs font-extrabold leading-4 text-[#5b6b82]"
            key={`${skill}-${index}`}
            title={skill}
          >
            {skill}
          </span>
        ))}
        {hiddenSkillCount > 0 ? (
          <span className="rounded-full bg-[#e9edf4] px-3 py-1 text-xs font-black leading-4 text-[#506580]">
            +{hiddenSkillCount}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function FitGauge({ score }: { score: number }) {
  const color = score >= 85 ? "#c47f3d" : score >= 78 ? "#3d5a9a" : score >= 70 ? "#8a96ab" : "#b07535";

  return (
    <div className="flex justify-center md:block">
      <div
        className="grid h-[84px] w-[84px] place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${score * 3.6}deg, #EDEFF2 0)`,
        }}
      >
        <div className="grid h-[64px] w-[64px] place-items-center rounded-full bg-white text-center">
          <span className="text-[22px] font-extrabold leading-none text-[#1d2533]">{score}</span>
          <span className="-mt-3 text-[10px] font-bold text-[#8a96ab]">적합도</span>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#f7f9fc] px-3 py-2.5">
      <div className="mb-[3px] text-[11px] font-semibold text-[#94a0b5]">{label}</div>
      <div className="truncate text-[15px] font-extrabold text-[#1d2533]" title={value}>
        {value}
      </div>
    </div>
  );
}

type SkillDetail =
  | NonNullable<AnalysisResult["skill_gap"]["possessed_details"]>[number]
  | NonNullable<AnalysisResult["skill_gap"]["missing_details"]>[number];

function SkillBarList({
  accent,
  details,
  fallbackItems,
  title,
}: {
  accent: string;
  details?: SkillDetail[];
  fallbackItems: string[];
  title: string;
}) {
  const displayItems =
    details?.length
      ? details.slice(0, 5)
      : fallbackItems
          .map(formatSkillPillText)
          .filter(Boolean)
          .slice(0, 5)
          .map((name, index) => ({
            name,
            level: title.includes("보유")
              ? index < 2 ? "상" : index < 4 ? "중상" : "중"
              : index < 2 ? "하" : index < 4 ? "중하" : "중",
            score: title.includes("보유") ? 92 - index * 7 : 24 + index * 8,
          }));

  return (
    <div className="rounded-[14px] border border-[#eef1f6] p-[18px]">
      <div className="mb-3.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: accent }} />
        <h3 className="text-[15px] font-extrabold" style={{ color: accent }}>
          {title}
        </h3>
      </div>
      <div className="grid gap-[13px]">
        {displayItems.map((item, index) => {
          return (
            <div key={`${item.name}-${index}`}>
              <div className="mb-[5px] flex justify-between gap-3 text-[13.5px] font-semibold text-[#2a3342]">
                <span className="min-w-0 truncate" title={item.name}>{item.name}</span>
                <span className="shrink-0" style={{ color: accent }}>{item.level}</span>
              </div>
              <div className="h-[7px] rounded-full bg-[#f4f4f4]">
                <div
                  className="h-[7px] rounded-full"
                  style={{ width: `${item.score}%`, backgroundColor: accent, opacity: 0.78 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatSkillPillText(value: string) {
  const cleaned = value
    .replace(/\s*\((?:데이터\s*제공|데이터제공|제공\s*데이터|데이터가\s*제공됨|데이터\s*없음|확인\s*불가)[^)]+\)\s*/g, " ")
    .replace(/\s*\((?:데이터\s*제공|데이터제공|제공\s*데이터|데이터가\s*제공됨|데이터\s*없음|확인\s*불가)\)\s*/g, " ")
    .replace(/(?:보유\s*여부\s*)?(?:데이터\s*없음|확인\s*불가|데이터\s*미제공|데이터가\s*제공되지\s*않음)/g, "")
    .replace(/[·•]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= 28) return cleaned;

  const separators = [" 요구", " 직무", " 여부", " 능력", " 기술", " 스킬"];
  const separatorIndex = separators
    .map((separator) => cleaned.indexOf(separator))
    .filter((index) => index > 8)
    .sort((a, b) => a - b)[0];

  const shortened = separatorIndex ? cleaned.slice(0, separatorIndex).trim() : cleaned.slice(0, 28).trim();
  return shortened.length > 28 ? `${shortened.slice(0, 27)}…` : shortened;
}

function TimingCard({
  body,
  details,
  recommended = false,
  title,
}: {
  body: string;
  details?: {
    label: string;
    pros: string[];
    cautions: string[];
  };
  recommended?: boolean;
  title: string;
}) {
  return (
    <article
      className={cn(
        "relative rounded-[16px] p-5",
        recommended ? "border-2 border-[#2e8b6f]" : "border border-[#e9edf4]",
      )}
    >
      {recommended ? (
        <span className="absolute -top-3 left-5 rounded-full bg-[#2e8b6f] px-3 py-1 text-[11px] font-extrabold text-white">
          추천
        </span>
      ) : null}
      <div className="mb-3.5 flex flex-wrap items-baseline gap-2.5">
        <h3 className="text-[17px] font-extrabold text-[#1d2533]">{title}</h3>
        {details?.label ? (
          <span className={cn("text-[13px] font-bold", recommended ? "text-[#2e8b6f]" : "text-[#8a96ab]")}>
            {details.label}
          </span>
        ) : null}
      </div>
      {details ? (
        <div className="grid gap-3.5">
          <BulletGroup color="#2e8b6f" items={details.pros} title="장점" />
          <BulletGroup color="#b07535" items={details.cautions} title="유의점" />
        </div>
      ) : (
        <ReadableText
          className="mt-3 text-[13.5px] font-medium leading-7 text-[#3a4762]"
          text={body}
        />
      )}
    </article>
  );
}

function BulletGroup({ color, items, title }: { color: string; items: string[]; title: string }) {
  if (!items.length) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-extrabold" style={{ color }}>
        {title}
      </p>
      <ul className="grid gap-1.5 pl-4 text-[13.5px] leading-6 text-[#3a4762]">
        {items.slice(0, 4).map((item) => (
          <li className="list-disc" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExternalButton({ compact, href, label }: { compact?: boolean; href: string; label: string }) {
  return (
    <a
      className={cn(
        "focus-ring inline-flex items-center gap-2 rounded-[10px] border border-[#d4dae6] bg-white font-bold text-[#2a3342]",
        compact ? "px-2.5 py-1 text-xs" : "px-4 py-2.5 text-[13.5px]",
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      <ExternalLink size={compact ? 12 : 15} />
    </a>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--border)] bg-white p-4 text-sm font-bold text-[var(--caption)]">
      {text}
    </div>
  );
}

function ReadableText({ className, text }: { className?: string; text: string }) {
  const paragraphs = splitReadableText(text);

  return (
    <div className={cn("space-y-1 break-words [overflow-wrap:anywhere]", className)}>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function splitReadableText(value: string) {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();

  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?。！？]+[.!?。！？]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [
    normalized,
  ];

  const paragraphs: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (current && next.length > 240) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) paragraphs.push(current);
  return paragraphs;
}

function formatDate(value?: string | null) {
  if (!value) return "정보 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatMoney(value?: number | null) {
  if (!value) return "확인 중";
  if (value >= 1_0000_0000_0000) return `${(value / 1_0000_0000_0000).toFixed(1)}조`;
  if (value >= 1_0000_0000) return `${Math.round(value / 1_0000_0000).toLocaleString("ko-KR")}억`;
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatSalary(value?: number | null) {
  if (!value) return "확인 중";
  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만`;
}
