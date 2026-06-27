"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { DEFENSE_FIELDS } from "@/lib/types";

const ranks = [
  "소위",
  "중위",
  "대위",
  "소령",
  "중령",
  "대령",
  "하사",
  "중사",
  "상사",
  "원사",
];

const specialties = [
  "보병",
  "포병",
  "기갑",
  "방공",
  "통신",
  "공병",
  "병기",
  "화학",
  "항공",
  "정보",
  "전산",
  "수송",
  "함정",
  "기타",
];

const loadingMessages = [
  "군 경력을 방산 직무 언어로 번역하는 중...",
  "방산업체 지정현황과 계약 데이터를 대조하는 중...",
  "직무 요구역량과 보유 역량의 간격을 계산하는 중...",
  "전역 준비 로드맵을 구성하는 중...",
];

type AnalyzeFormState = {
  military_branch: string;
  rank: string;
  specialty: string;
  position: string;
  years_served: number | "";
  major: string;
  desired_field: string;
};

export function AnalyzeForm() {
  const router = useRouter();
  const [form, setForm] = useState<AnalyzeFormState>({
    military_branch: "육군",
    rank: "대위",
    specialty: "통신",
    position: "통신전자장비 정비장교",
    years_served: 7,
    major: "전자공학",
    desired_field: "잘 모름",
  });
  const [certInput, setCertInput] = useState("정보처리기사");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  const isValid = useMemo(() => {
    const yearsServed = Number(form.years_served);
    return (
      form.military_branch &&
      form.rank &&
      form.specialty &&
      form.position &&
      Number.isInteger(yearsServed) &&
      yearsServed >= 1 &&
      yearsServed <= 30 &&
      form.major &&
      form.desired_field
    );
  }, [form]);

  function updateField(name: keyof AnalyzeFormState, value: string | number) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function addCertification() {
    const value = certInput.trim();
    if (!value || certifications.includes(value)) return;
    setCertifications((current) => [...current, value]);
    setCertInput("");
  }

  async function submit() {
    if (!isValid || isLoading) return;
    setError("");
    setIsLoading(true);
    setIsAnalysisComplete(false);
    setProgress(8);

    const progressInterval = window.setInterval(() => {
      setProgress((current) => {
        if (current < 58) return Math.min(current + 7, 58);
        if (current < 85) return Math.min(current + 4, 85);
        return Math.min(current + 1, 99);
      });
    }, 550);

    try {
      const requestInput = {
        ...form,
        years_served: Number(form.years_served),
        certifications,
      };
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestInput),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "분석에 실패했습니다.");
      setProgress(99);
      setIsAnalysisComplete(true);
      sessionStorage.setItem("nextpost:last-result", JSON.stringify(payload));
      sessionStorage.setItem("nextpost:last-input", JSON.stringify(requestInput));
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      router.push("/results");
    } catch (error) {
      setError(error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.");
      setIsLoading(false);
      setProgress(0);
      setIsAnalysisComplete(false);
    } finally {
      window.clearInterval(progressInterval);
    }
  }

  return (
    <div className="page-shell py-8" aria-busy={isLoading}>
      {isLoading ? (
        <AnalysisProgressOverlay
          isComplete={isAnalysisComplete}
          progress={progress}
        />
      ) : null}

      <Link
        className="focus-ring mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
        href="/"
      >
        <ArrowLeft size={16} />
        홈으로
      </Link>

      <div className="grid gap-8 lg:grid-cols-[0.76fr_0.24fr]">
        <section className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold text-[var(--accent)]">AI 커리어 분석</p>
            <h1 className="mt-2 text-3xl font-semibold">군 경력 정보를 입력하세요</h1>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="군별">
              <select
                className="input"
                value={form.military_branch}
                onChange={(event) => updateField("military_branch", event.target.value)}
              >
                {["육군", "해군", "공군", "해병대"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="계급">
              <select
                className="input"
                value={form.rank}
                onChange={(event) => updateField("rank", event.target.value)}
              >
                {ranks.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="병과">
              <select
                className="input"
                value={form.specialty}
                onChange={(event) => updateField("specialty", event.target.value)}
              >
                {specialties.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="복무년수">
              <input
                className="input"
                max={30}
                min={1}
                inputMode="numeric"
                type="number"
                value={form.years_served}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("years_served", value === "" ? "" : Number(value));
                }}
              />
            </Field>

            <Field label="보직/주특기">
              <input
                className="input"
                value={form.position}
                onChange={(event) => updateField("position", event.target.value)}
                placeholder="예: 전차 정비장교"
              />
            </Field>

            <Field label="전공">
              <input
                className="input"
                value={form.major}
                onChange={(event) => updateField("major", event.target.value)}
                placeholder="예: 전자공학"
              />
            </Field>

            <Field label="희망 방산분야">
              <select
                className="input"
                value={form.desired_field}
                onChange={(event) => updateField("desired_field", event.target.value)}
              >
                <option>잘 모름</option>
                {DEFENSE_FIELDS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="보유 자격증">
              <div className="flex gap-2">
                <input
                  className="input"
                  value={certInput}
                  onChange={(event) => setCertInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCertification();
                    }
                  }}
                  placeholder="엔터로 추가"
                />
                <button
                  className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--muted)]"
                  type="button"
                  onClick={addCertification}
                  aria-label="자격증 추가"
                >
                  <Plus size={18} />
                </button>
              </div>
            </Field>
          </div>

          {certifications.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {certifications.map((cert) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-[#e7eee8] px-3 py-1 text-sm"
                  key={cert}
                >
                  {cert}
                  <button
                    aria-label={`${cert} 삭제`}
                    onClick={() =>
                      setCertifications((current) => current.filter((item) => item !== cert))
                    }
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-md border border-[#e9b8ad] bg-[#fff1ee] px-4 py-3 text-sm text-[#8a2d1d]">
              {error}
            </div>
          ) : null}

          <button
            className="focus-ring mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            disabled={!isValid || isLoading}
            type="button"
            onClick={submit}
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            분석 시작
          </button>
        </section>

        <aside className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">분석 흐름</h2>
          <ol className="mt-5 space-y-4 text-sm text-[var(--muted-foreground)]">
            <li>1. 병과·보직 기반 방산 분야 매핑</li>
            <li>2. 공개 계약금액 기준 후보 기업 추출</li>
            <li>3. 직무 요구역량·교육 데이터 로드</li>
            <li>4. OpenAI가 후보 데이터만 해석</li>
          </ol>
        </aside>
      </div>
    </div>
  );
}

function AnalysisProgressOverlay({
  isComplete,
  progress,
}: {
  isComplete: boolean;
  progress: number;
}) {
  const roundedProgress = Math.round(progress);
  const messageIndex = Math.min(
    loadingMessages.length - 1,
    Math.floor((roundedProgress / 100) * loadingMessages.length),
  );
  const loadingMessage = loadingMessages[messageIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(247,248,244,0.78)] px-4 py-6 backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex min-h-[240px] w-full max-w-[240px] items-center justify-center rounded-lg border border-[rgba(216,222,212,0.82)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_50px_rgba(24,32,31,0.14)]">
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-500 ease-out ${
            isComplete
              ? "translate-y-[-10px] scale-95 opacity-0"
              : "translate-y-0 scale-100 opacity-100"
          }`}
        >
          <Loader2 className="animate-spin text-[#2f80ed]" size={46} strokeWidth={3} />
          <p className="mt-5 text-sm font-semibold text-[#17211f]">분석 진행 중</p>
          <p className="mt-3 text-lg font-semibold text-[#2f80ed]">{roundedProgress}%</p>
          <p className="mt-3 max-w-[190px] text-xs font-semibold leading-5 text-[#52615d]">
            {loadingMessage}
          </p>
        </div>

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all delay-150 duration-500 ease-out ${
            isComplete
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-[10px] scale-95 opacity-0"
          }`}
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#2f80ed] text-white shadow-[0_10px_30px_rgba(47,128,237,0.24)]">
            <CheckCircle2 size={36} strokeWidth={3} />
          </span>
          <p className="mt-5 text-sm font-semibold text-[#17211f]">
            완료되었습니다. 로딩합니다 ~
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#243734]">
      {label}
      {children}
    </label>
  );
}
