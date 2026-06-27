"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Target,
} from "lucide-react";
import { AnalysisResult } from "@/lib/types";
import { formatWon } from "@/lib/utils";
import { DataChat } from "@/components/data-chat";

type ResultPayload = AnalysisResult & {
  ai_provider?: "openai" | "fallback";
};

export function ResultsDashboard() {
  const [result, setResult] = useState<ResultPayload | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("nextpost:last-result");
    if (raw) {
      window.setTimeout(() => setResult(JSON.parse(raw)), 0);
    }
  }, []);

  const topScore = useMemo(
    () => result?.recommended_companies?.[0]?.fit_score ?? 0,
    [result],
  );

  if (!result) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center py-10">
        <div className="max-w-md rounded-lg border border-[var(--border)] bg-white p-8 text-center shadow-sm">
          <Target className="mx-auto text-[var(--primary)]" size={36} />
          <h1 className="mt-4 text-2xl font-semibold">분석 결과가 없습니다</h1>
          <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
            입력 폼에서 분석을 먼저 실행하면 결과 대시보드를 볼 수 있습니다.
          </p>
          <Link
            className="focus-ring mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[var(--primary)] px-5 font-semibold text-white"
            href="/analyze"
          >
            분석하러 가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="focus-ring inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
          href="/analyze"
        >
          <ArrowLeft size={16} />
          다시 입력하기
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-sm text-[var(--muted-foreground)]">
          <ShieldCheck size={16} />
          {result.ai_provider === "fallback" ? "로컬 규칙 분석" : "OpenAI 분석"}
        </div>
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.7fr_0.3fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              {result.matched_field} · {result.matched_job_group}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">AI 방산 커리어 리포트</h1>
            <p className="mt-4 leading-8 text-[var(--muted-foreground)]">
              {result.skill_translation.summary}
            </p>
          </div>
          <div className="rounded-lg bg-[#eef5f2] p-5">
            <p className="text-sm text-[var(--muted-foreground)]">최상위 기업 적합도</p>
            <p className="mt-2 text-5xl font-semibold text-[var(--primary)]">{topScore}%</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {result.skill_translation.keywords.map((keyword) => (
            <span className="rounded-full bg-[#e7eee8] px-3 py-1 text-sm" key={keyword}>
              {keyword}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <BriefcaseBusiness className="text-[var(--primary)]" size={22} />
          <h2 className="text-2xl font-semibold">추천 기업</h2>
        </div>
        <div className="grid gap-4">
          {result.recommended_companies.map((company) => (
            <article
              className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm"
              key={company.company_name}
            >
              <div className="grid gap-5 md:grid-cols-[1fr_140px] md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold">{company.company_name}</h3>
                    {company.defense_field ? (
                      <span className="rounded-full bg-[#eef1ea] px-2.5 py-1 text-xs">
                        {company.defense_field}
                      </span>
                    ) : null}
                    {company.is_cost_certified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f4ec] px-2.5 py-1 text-xs text-[#1f6c3d]">
                        <CheckCircle2 size={13} />
                        원가관리 인증
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                    {company.reason}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {company.recommended_positions.map((position) => (
                      <span
                        className="rounded-full bg-[#fff0ec] px-3 py-1 text-sm text-[#88311f]"
                        key={position}
                      >
                        {position}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
                    <span>계약 규모: {formatWon(company.total_contract_amount)}</span>
                    <span>최근 계약년도: {company.recent_contract_year ?? "정보 없음"}</span>
                    <span>
                      평균연봉:{" "}
                      {company.avg_salary
                        ? `${company.avg_salary.toLocaleString("ko-KR")}만원`
                        : "공시정보 없음"}
                    </span>
                  </div>
                  {company.careers_page_url ? (
                    <a
                      className="focus-ring mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold"
                      href={company.careers_page_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      채용 공고 보러가기
                      <ExternalLink size={15} />
                    </a>
                  ) : null}
                </div>
                <FitGauge score={company.fit_score} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Target className="text-[var(--primary)]" size={22} />
            <h2 className="text-xl font-semibold">Skill Gap</h2>
          </div>
          <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
            {result.skill_gap.analysis}
          </p>
          <h3 className="mt-5 text-sm font-semibold">보유 역량</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.skill_gap.possessed.map((item) => (
              <span className="rounded-full bg-[#e7f4ec] px-3 py-1 text-sm text-[#1f6c3d]" key={item}>
                {item}
              </span>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-semibold">보완 필요</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.skill_gap.missing.map((item) => (
              <span className="rounded-full bg-[#fff0ec] px-3 py-1 text-sm text-[#88311f]" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <RotateCcw className="text-[var(--primary)]" size={22} />
            <h2 className="text-xl font-semibold">전역 타이밍</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-md bg-[#f4f6f1] p-4">
              <p className="font-semibold">지금 전역하면</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {result.discharge_timing.now}
              </p>
            </div>
            <div className="rounded-md bg-[#f4f6f1] p-4">
              <p className="font-semibold">더 복무하면</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {result.discharge_timing.later}
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-md bg-[#eef5f2] p-4 leading-7 text-[#214844]">
            {result.discharge_timing.recommendation}
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-[var(--primary)]" size={22} />
          <h2 className="text-xl font-semibold">교육·자격증 로드맵</h2>
        </div>
        <div className="mt-5 grid gap-3">
          {result.education_roadmap.map((item) => (
            <div
              className="grid gap-3 rounded-md border border-[var(--border)] p-4 md:grid-cols-[84px_1fr]"
              key={`${item.step}-${item.education_name}`}
            >
              <div className="text-sm font-semibold text-[var(--accent)]">
                STEP {item.step}
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">{item.level}</div>
              </div>
              <div>
                <a
                  className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                  href={item.education_link}
                  rel="noreferrer"
                  target="_blank"
                >
                  {item.education_name}
                </a>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Award size={18} className="text-[var(--accent)]" />
          {result.recommended_certs.map((cert) => (
            <span className="rounded-full bg-[#eef1ea] px-3 py-1 text-sm" key={cert}>
              {cert}
            </span>
          ))}
        </div>
      </section>

      {result.career_centers?.length ? (
        <section className="mt-6 rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="text-[var(--primary)]" size={22} />
            <h2 className="text-xl font-semibold">병역진로설계지원센터</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {result.career_centers.map((center) => (
              <div className="rounded-md bg-[#f4f6f1] p-4" key={center.id}>
                <p className="font-semibold">{center.name}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {center.address}
                </p>
                <p className="mt-2 text-sm font-semibold">{center.phone}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <DataChat analysisResult={result} />
    </main>
  );
}

function FitGauge({ score }: { score: number }) {
  return (
    <div className="rounded-lg bg-[#eef5f2] p-4 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-[#155e63] bg-white">
        <span className="text-2xl font-semibold text-[var(--primary)]">{score}%</span>
      </div>
      <p className="mt-3 text-sm font-semibold">적합도</p>
    </div>
  );
}
