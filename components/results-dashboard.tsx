"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BookOpen,
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
import { DataChat } from "@/components/data-chat";
import { getAuthHeaders } from "@/lib/auth-client";

type ResultPayload = AnalysisResult & {
  ai_provider?: "openai" | "fallback";
};

type CompanyDetail = NonNullable<AnalysisResult["company_details"]>[number];
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

  const companyDetails = result.company_details ?? [];
  const mobileTabs = [
    { href: "#report-summary", label: "요약" },
    { href: "#report-matching", label: "직무근거" },
    { href: "#report-companies", label: "추천기업" },
    { href: "#report-skills", label: "준비도" },
    { href: "#report-chat", label: "AI상담" },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)]">
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

      <div className="mx-auto max-w-[1480px] px-3 py-5 md:px-6 md:py-10">
        <div className="mb-4 grid gap-2 no-print sm:flex sm:flex-wrap sm:items-center">
          <Link
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[var(--border)] bg-white px-3 text-sm font-extrabold text-[var(--caption)] sm:justify-start"
            href="/analyze"
          >
            <ArrowLeft size={16} />
            다시 입력하기
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:flex-wrap">
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

        <nav className="no-print sticky top-[57px] z-20 -mx-3 mb-4 flex gap-2 overflow-x-auto border-y border-[var(--border)] bg-[var(--background)] px-3 py-2 sm:hidden">
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,480px)] xl:items-start">
          <div className="min-w-0">
            <article className="np-card overflow-hidden">
              <section className="scroll-mt-28 p-4 md:p-8" id="report-summary">
                <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-start md:gap-6">
                  <div>
                    <p className="text-xs font-black tracking-[1px] text-[var(--primary)] md:text-sm">
                      {result.matched_field} · {result.matched_job_group}
                    </p>
                    <h1 className="mt-2 text-[26px] font-black leading-tight tracking-normal md:mt-3 md:text-[35px] md:tracking-[-0.6px]">
                      MY 방산 커리어 리포트
                    </h1>
                    <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)] md:mt-4 md:text-[15px] md:leading-7">
                      {result.skill_translation.summary}
                    </p>
                  </div>
                  <div className="rounded-[12px] bg-white p-4 text-center md:rounded-[14px] md:p-5">
                    <p className="text-xs font-extrabold text-[#5b6b82] md:text-sm">최상위 기업 적합도</p>
                    <p className="mt-2 text-[48px] font-black leading-none tracking-normal md:text-[64px] md:tracking-[-1px]">
                      {topScore}
                    </p>
                    <p className="mt-2 text-xs font-black text-[var(--caption)]">점</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 md:mt-6">
                  {result.skill_translation.keywords.map((keyword) => (
                    <span className="np-pill px-3 py-1" key={keyword}>
                      {keyword}
                    </span>
                  ))}
                </div>

                <ReportSummary result={result} />
              </section>

              <Divider />

              <ReportSection icon={Target} id="report-matching" title="직무 매칭 근거">
                <div className="grid gap-4">
                  <div className="rounded-[12px] bg-[#F8FAFB] p-4 md:p-5">
                    <p className="text-sm font-black text-[var(--primary)]">군 경력 변환</p>
                    <h3 className="mt-2 text-xl font-black">{result.matched_job_group}</h3>
                    <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
                      입력한 병과, 보직, 전공, 자격 정보를 방산 직무 요구역량과 비교해 아래 직무
                      후보로 변환했습니다. 추천 기업은 이 직무 후보와 채용 신호가 맞는 순서로
                      정렬됩니다.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--caption)]">
                        매칭 분야 {result.matched_field}
                      </span>
                      {result.matching_evidence?.specialty_keyword ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--caption)]">
                          병과 {result.matching_evidence.specialty_keyword}
                        </span>
                      ) : null}
                      {result.matching_evidence?.matched_by?.map((item) => (
                        <span
                          className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--caption)]"
                          key={item}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {(result.job_cards ?? []).map((job) => (
                      <article
                        className="rounded-[12px] border border-[var(--border)] bg-white p-4"
                        key={job.job_title}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-black">{job.job_title}</h3>
                          {job.related_weapon_system ? (
                            <span className="rounded-full bg-[#EEF4FA] px-3 py-1 text-xs font-black text-[#506580]">
                              {job.related_weapon_system}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.required_skills.map((skill) => (
                            <span
                              className="rounded-full bg-[#F4F6F8] px-3 py-1 text-xs font-extrabold text-[#5b6b82]"
                              key={skill}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        {job.preferred_military_exp ? (
                          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                            {job.preferred_military_exp}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              </ReportSection>

              <Divider />

              <ReportSection icon={BriefcaseBusiness} id="report-companies" title="추천 기업">
                <div className="grid gap-4">
                  {result.recommended_companies.map((company) => {
                    const detail = companyDetails.find(
                      (item) => item.company_name === company.company_name,
                    );
                    const reliability = result.data_reliability?.find(
                      (item) => item.company_name === company.company_name,
                    );
                    const evidence = result.recommendation_evidence?.find(
                      (item) => item.company_name === company.company_name,
                    );

                    return (
                      <CompanyCard
                        company={company}
                        detail={detail}
                        evidence={evidence?.evidence_points ?? []}
                        key={company.company_name}
                        reliability={reliability}
                      />
                    );
                  })}
                </div>
              </ReportSection>

              <Divider />

              <ReportSection icon={Target} id="report-skills" title="직무 준비도">
                <div className="grid gap-5">
                  <div>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                      {result.skill_gap.analysis}
                    </p>
                    <div className="mt-5 h-4 overflow-hidden rounded-full bg-[#EDEFF2]">
                      <div className="h-full w-[62%] bg-[var(--accent)]" />
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-black text-[var(--caption)]">
                      <span>현재 62%</span>
                      <span>보완 후 88%</span>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SkillPills title="보유 역량" items={result.skill_gap.possessed} />
                    <SkillPills title="보완 필요" items={result.skill_gap.missing} />
                  </div>
                </div>
              </ReportSection>

              <Divider />

              <ReportSection icon={GraduationCap} title="교육 · 자격증 로드맵">
                <div className="grid gap-3">
                  {result.education_roadmap.map((item) => (
                    <a
                      className="grid gap-3 rounded-[12px] border border-[var(--border)] p-4 hover:border-[var(--primary)] md:grid-cols-[86px_1fr]"
                      href={item.education_link}
                      key={`${item.step}-${item.education_name}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <div className="text-sm font-black text-[var(--blue-score)]">
                        STEP {item.step}
                        <div className="mt-1 text-xs text-[var(--caption)]">{item.level}</div>
                      </div>
                      <div>
                        <p className="font-black">{item.education_name}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {item.reason}
                        </p>
                      </div>
                    </a>
                  ))}
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

              <ReportSection icon={RotateCcw} title="전역 타이밍">
                <div className="grid gap-3 md:grid-cols-2">
                  <TimingCard title="지금 전역" body={result.discharge_timing.now} />
                  <TimingCard title="추가 복무" body={result.discharge_timing.later} />
                </div>
                <div className="mt-4 rounded-[12px] border border-[#E1E8E6] bg-[#FAFBFC] p-4">
                  <p className="text-base font-extrabold leading-7">
                    추천: {result.discharge_timing.recommendation}
                  </p>
                </div>
              </ReportSection>

              {result.glossary_matches?.length ? (
                <>
                  <Divider />
                  <ReportSection icon={BookOpen} title="방산 용어 풀이">
                    <div className="grid gap-3 md:grid-cols-2">
                      {result.glossary_matches.map((item) => (
                        <details className="group rounded-[12px] bg-[#F8FAFB] p-4" key={item.term}>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black">
                            <span>{item.term}</span>
                            <ChevronDown
                              className="text-[var(--caption)] transition-transform group-open:rotate-180"
                              size={17}
                            />
                          </summary>
                          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                            {item.description}
                          </p>
                        </details>
                      ))}
                    </div>
                  </ReportSection>
                </>
              ) : null}

            </article>
          </div>

          <aside className="no-print min-h-0 scroll-mt-28 xl:sticky xl:top-[92px]" id="report-chat">
            <DataChat
              analysisResult={result}
              className="mt-5 h-[620px] min-h-[500px] xl:mt-0 xl:h-[calc(100dvh-188px)]"
            />
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

function ReportSummary({ result }: { result: AnalysisResult }) {
  const coverage = result.data_coverage_summary;

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 md:mt-6 md:grid-cols-4 md:gap-3">
      <MetricTile label="추천 기업" value={`${result.recommended_companies.length}개`} />
      <MetricTile label="직무 후보" value={`${result.job_cards?.length ?? 0}개`} />
      <MetricTile label="추천 자격" value={`${result.recommended_certs.length}개`} />
      <MetricTile
        label="근거 확보"
        value={coverage ? `${coverage.with_sources}/${coverage.recommended_company_count}` : "정보 없음"}
      />
    </div>
  );
}

function CompanyCard({
  company,
  detail,
  evidence,
  reliability,
}: {
  company: RecommendedCompany;
  detail?: CompanyDetail;
  evidence: string[];
  reliability?: NonNullable<AnalysisResult["data_reliability"]>[number];
}) {
  const topJob = detail?.job_postings?.[0];
  const homepageUrl = detail?.homepage_url;
  const careerUrl = detail?.careers_page_url ?? company.careers_page_url;

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-white p-4 md:rounded-[16px] md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_104px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black md:text-xl">{company.company_name}</h3>
            {company.defense_field ? <span className="np-pill px-2.5 py-1">{company.defense_field}</span> : null}
            {company.is_cost_certified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F6EF] px-2.5 py-1 text-xs font-black text-[var(--success)]">
                <CheckCircle2 size={13} />
                원가관리 인증
              </span>
            ) : null}
            {detail?.data_quality_score ? (
              <span className="rounded-full bg-[#EEF4FA] px-2.5 py-1 text-xs font-black text-[#506580]">
                데이터 {detail.data_quality_score}점
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
            {company.reason}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {company.recommended_positions.map((position) => (
              <span
                className="rounded-full bg-[#F4F6F8] px-3 py-1 text-xs font-extrabold text-[#5b6b82]"
                key={position}
              >
                {position}
              </span>
            ))}
          </div>

          <div className="mt-4 grid gap-2 text-xs font-bold text-[var(--caption)] md:grid-cols-3">
            <span>추천 직무 {company.recommended_positions.slice(0, 2).join(", ") || "직무 확인 필요"}</span>
            <span>채용 신호 {detail?.job_postings?.length ?? 0}건</span>
            <span>
              평균연봉 {company.avg_salary ? `${company.avg_salary.toLocaleString("ko-KR")}만원` : "공시 없음"}
            </span>
          </div>

          <div className="mt-4">
            <SignalBox
              icon={BriefcaseBusiness}
              label="채용 신호"
              value={topJob?.title ?? "채용 링크 확인"}
              meta={[
                topJob?.job_function,
                topJob?.experience_level,
                topJob?.is_active === false ? "과거/참고 공고" : null,
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {homepageUrl ? (
              <ExternalButton href={homepageUrl} label="공식 홈페이지" />
            ) : null}
            {careerUrl ? <ExternalButton href={careerUrl} label="채용 페이지" /> : null}
          </div>

          <details className="group mt-5 rounded-[14px] border border-[var(--border)] bg-[#FAFBFC]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-black">
              <span>보직 기반 추천 이유</span>
              <ChevronDown
                className="text-[var(--caption)] transition-transform group-open:rotate-180"
                size={18}
              />
            </summary>
            <div className="grid gap-4 border-t border-[var(--border)] p-3 md:gap-5 md:p-4">
              <CompanyMeta detail={detail} company={company} reliability={reliability} />
              {evidence.length ? <EvidenceList evidence={evidence} /> : null}
              <JobSignalList postings={detail?.job_postings ?? []} />
            </div>
          </details>
        </div>

        <FitGauge score={company.fit_score} />
      </div>
    </article>
  );
}

function CompanyMeta({
  company,
  detail,
  reliability,
}: {
  company: RecommendedCompany;
  detail?: CompanyDetail;
  reliability?: NonNullable<AnalysisResult["data_reliability"]>[number];
}) {
  return (
    <div className="rounded-[12px] bg-white p-4">
      <p className="text-sm font-black text-[var(--primary)]">보직 기반 해석</p>
      <p className="mt-2 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
        이 기업은 {company.recommended_positions.slice(0, 3).join(", ") || "관련 직무"}와 연결됩니다.
        채용 신호, 추천 직무, 계약 분야를 함께 보되 화면에서는 사용자가 준비할 직무 중심으로
        압축했습니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {company.recommended_positions.map((position) => (
          <span className="rounded-full bg-[#F4F6F8] px-3 py-1 text-xs font-black text-[#5b6b82]" key={position}>
            {position}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[var(--caption)]">
        {reliability ? <span>데이터 신뢰도 {reliability.score}점</span> : null}
        {detail?.designation_date ? <span>방산 지정 {formatDate(detail.designation_date)}</span> : null}
        {company.salary_source ? <span>연봉 출처 {company.salary_source}</span> : null}
      </div>
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: string[] }) {
  return (
    <div className="rounded-[12px] bg-white p-4">
      <p className="text-sm font-black text-[var(--primary)]">왜 이 기업인가</p>
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
  return <div className="mx-4 h-px bg-[#EEF1F3] md:mx-8" />;
}

function ReportSection({
  children,
  icon: Icon,
  id,
  title,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  id?: string;
  title: string;
}) {
  return (
    <section className="scroll-mt-28 p-4 md:p-8" id={id}>
      <div className="mb-4 flex items-center gap-2 md:mb-5 md:gap-3">
        <Icon className="text-[var(--primary)]" size={21} />
        <h2 className="text-xl font-black tracking-normal md:text-2xl md:tracking-[-0.4px]">{title}</h2>
      </div>
      {children}
    </section>
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

function FitGauge({ score }: { score: number }) {
  const color =
    score >= 85
      ? "var(--success)"
      : score >= 78
        ? "var(--blue-score)"
        : score >= 70
          ? "var(--warning)"
          : "var(--danger)";
  const tier = score >= 85 ? "매우 높음" : score >= 78 ? "높음" : score >= 70 ? "보통" : "검토";

  return (
    <div className="flex flex-row items-center justify-center gap-3 border-t border-[#F0F2F4] pt-4 lg:flex-col lg:border-l lg:border-t-0 lg:gap-0 lg:pl-4 lg:pt-0">
      <div
        className="grid h-[78px] w-[78px] place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${score * 3.6}deg, #EDEFF2 0)`,
        }}
      >
        <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white text-base font-black">
          {score}
        </div>
      </div>
      <p className="mt-2 text-xs font-black" style={{ color }}>
        {tier}
      </p>
    </div>
  );
}

function SkillPills({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-3 md:p-4">
      <h3 className="font-black text-[var(--foreground)]">{title}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <span className="rounded-full bg-[#F4F6F8] px-3 py-1 text-xs font-extrabold text-[var(--foreground)]" key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimingCard({ body, title }: { body: string; title: string }) {
  return (
    <article className="rounded-[12px] border border-[var(--border)] bg-[#F8FAFB] p-3 md:p-4">
      <h3 className="font-black">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-7 text-[var(--muted-foreground)]">{body}</p>
    </article>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-3 md:p-4">
      <p className="text-xs font-black text-[var(--caption)]">{label}</p>
      <p className="mt-2 break-words text-base font-black text-[var(--foreground)] md:text-lg">{value}</p>
    </div>
  );
}

function SignalBox({
  icon: Icon,
  label,
  meta,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: Array<string | null | undefined>;
}) {
  return (
    <div className="rounded-[12px] bg-[#F8FAFB] p-3">
      <p className="flex items-center gap-2 text-xs font-black text-[var(--primary)]">
        <Icon size={15} />
        {label}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-black leading-6">{value}</p>
      <p className="mt-2 text-xs font-bold leading-5 text-[var(--caption)]">
        {meta.filter(Boolean).join(" · ") || "세부 정보 없음"}
      </p>
    </div>
  );
}

function ExternalButton({ compact, href, label }: { compact?: boolean; href: string; label: string }) {
  return (
    <a
      className={cn(
        "focus-ring inline-flex items-center gap-2 rounded-[9px] border border-[var(--border)] bg-white font-extrabold",
        compact ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm",
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
