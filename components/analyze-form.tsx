"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  Radar,
  X,
} from "lucide-react";
import Link from "next/link";
import { AuthMenu } from "@/components/auth-menu";
import { DEFENSE_FIELDS } from "@/lib/types";

const branchOptions = [
  { label: "육군", value: "육군" },
  { label: "해군", value: "해군" },
  { label: "공군", value: "공군" },
  { label: "해병대", value: "해병대" },
];

const ranks = ["소위", "중위", "대위", "소령", "중령", "대령", "하사", "중사", "상사", "원사"];

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
  "행정",
  "기타",
];

const defenseFieldLabels = [
  "항공유도",
  "통신전자",
  "기동",
  "함정",
  "탄약",
  "화력",
  "화생방",
  "기타",
];

const specialtyPresets: Record<
  string,
  {
    certs: string[];
    field: string;
    positions: string[];
    skills: string[];
  }
> = {
  통신: {
    field: "통신전자",
    positions: ["통신전자장비 정비/운용", "C4I 운용", "무전/위성통신 운용"],
    skills: ["RF", "C4ISR", "네트워크", "전자회로"],
    certs: ["정보처리기사", "무선설비기사", "정보통신기사"],
  },
  전산: {
    field: "통신전자",
    positions: ["전산체계 운용", "정보체계 관리", "보안관제"],
    skills: ["소프트웨어", "DB", "보안", "클라우드"],
    certs: ["정보처리기사", "SQLD", "정보보안기사"],
  },
  항공: {
    field: "항공유도",
    positions: ["항공정비", "항공전자 운용", "무인체계 운용"],
    skills: ["항공전자", "센서", "정비", "품질"],
    certs: ["항공산업기사", "전자기사", "품질경영기사"],
  },
  기갑: {
    field: "기동",
    positions: ["전차/장갑차 정비", "기동장비 운용", "차량 정비"],
    skills: ["기계", "정비", "유압", "품질"],
    certs: ["일반기계기사", "자동차정비기사", "품질경영기사"],
  },
  포병: {
    field: "화력",
    positions: ["화력장비 운용", "사격통제", "탄도/표적 분석"],
    skills: ["사격통제", "센서", "기계", "데이터 분석"],
    certs: ["기계설계기사", "전자기사", "정보처리기사"],
  },
  병기: {
    field: "탄약",
    positions: ["탄약/무장 정비", "창정비", "품질검사"],
    skills: ["정비", "품질", "안전", "검사"],
    certs: ["화공기사", "품질경영기사", "산업안전기사"],
  },
};

const loadingMessages = [
  "군 경력을 방산 직무 언어로 번역하는 중입니다.",
  "방산업체 지정현황과 계약 데이터를 대조하는 중입니다.",
  "직무 요구역량과 보유 역량의 간격을 계산하는 중입니다.",
  "AI 커리어 리포트와 준비 로드맵을 구성하는 중입니다.",
];

type AnalyzeFormState = {
  military_branch: string;
  rank: string;
  specialty: string;
  position: string;
  years_served: number | "";
  major: string;
  desired_field: string;
  preferred_region: string;
};

export function AnalyzeForm() {
  const router = useRouter();
  const [form, setForm] = useState<AnalyzeFormState>({
    military_branch: branchOptions[0].value,
    rank: "대위",
    specialty: "통신",
    position: "통신전자장비 정비/운용",
    years_served: 7,
    major: "전자공학",
    desired_field: DEFENSE_FIELDS[1] ?? DEFENSE_FIELDS[0],
    preferred_region: "서울",
  });
  const [certInput, setCertInput] = useState("정보처리기사");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  const specialtyPreset = specialtyPresets[form.specialty];
  const completionItems = useMemo(
    () => [
      { label: "군 경력", done: Boolean(form.military_branch && form.rank && form.specialty) },
      { label: "보직 경험", done: Boolean(form.position && Number(form.years_served) >= 1) },
      { label: "직무 목표", done: Boolean(form.major && form.desired_field) },
      { label: "자격/교육", done: certifications.length > 0 },
    ],
    [certifications.length, form],
  );
  const completionRate = Math.round(
    (completionItems.filter((item) => item.done).length / completionItems.length) * 100,
  );

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

  function addCertification(nextValue = certInput) {
    const value = nextValue.trim();
    if (!value || certifications.includes(value)) return;
    setCertifications((current) => [...current, value]);
    if (nextValue === certInput) setCertInput("");
  }

  function applySpecialtyPreset(position?: string) {
    if (!specialtyPreset) return;
    setForm((current) => ({
      ...current,
      desired_field: specialtyPreset.field,
      position: position ?? specialtyPreset.positions[0] ?? current.position,
    }));
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
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
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
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(rgba(18,22,28,.38),rgba(18,22,28,.50)),url('/assets/kf21-hero.jpg')] bg-cover bg-center">
      {isLoading ? <AnalysisProgressOverlay isComplete={isAnalysisComplete} progress={progress} /> : null}

      <header className="page-shell flex items-center py-7 text-white">
        <Link className="text-[22px] font-black tracking-[1px] drop-shadow" href="/">
          NEXTPOST
        </Link>
        <nav className="ml-auto flex items-center gap-5 text-sm font-extrabold drop-shadow">
          <Link href="/">홈으로</Link>
          <AuthMenu compact />
        </nav>
      </header>

      <div className="mx-auto max-w-[358px] px-4 pb-20 pt-4 sm:max-w-[980px]">
        <div className="text-center text-white">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-extrabold backdrop-blur">
            <Radar size={16} />
            AI 방산 커리어 분석
          </p>
          <h1 className="mt-5 max-w-full text-3xl font-black leading-tight tracking-normal drop-shadow sm:text-4xl md:text-5xl">
            <span className="sm:hidden">군 경력 입력</span>
            <span className="hidden sm:inline">군 경력 정보를 입력하세요</span>
          </h1>
        </div>

        <section className="np-card mt-9 p-6 md:p-10">
          <div className="mb-8 grid gap-4 rounded-[14px] bg-[#F8FAFB] p-4 md:grid-cols-[180px_1fr] md:items-center">
            <div>
              <p className="text-sm font-black text-[var(--primary)]">입력 완성도</p>
              <p className="mt-1 text-3xl font-black tracking-normal">{completionRate}%</p>
            </div>
            <div>
              <div className="h-3 overflow-hidden rounded-full bg-[#E5E8EB]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {completionItems.map((item) => (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      item.done
                        ? "bg-[#E9F6EF] text-[var(--success)]"
                        : "bg-white text-[var(--caption)]"
                    }`}
                    key={item.label}
                  >
                    {item.done ? "완료" : "필요"} · {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <FormSection number="1" title="기본 군 정보">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="군별" required>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  {branchOptions.map((branch) => {
                    const selected = form.military_branch === branch.value;
                    return (
                      <button
                        className={`focus-ring h-[46px] rounded-[9px] border-[1.5px] text-sm font-extrabold ${
                          selected
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-[#E5E8EB] bg-[#F9FAFB] text-[var(--muted-foreground)]"
                        }`}
                        key={branch.value}
                        type="button"
                        onClick={() => updateField("military_branch", branch.value)}
                      >
                        {branch.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="계급" required>
                <select className="input" value={form.rank} onChange={(e) => updateField("rank", e.target.value)}>
                  {ranks.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="병과" required>
                <select
                  className="input"
                  value={form.specialty}
                  onChange={(event) => {
                    const specialty = event.target.value;
                    const preset = specialtyPresets[specialty];
                    setForm((current) => ({
                      ...current,
                      specialty,
                      desired_field: preset?.field ?? current.desired_field,
                      position: preset?.positions[0] ?? current.position,
                    }));
                  }}
                >
                  {specialties.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                {specialtyPreset ? (
                  <div className="mt-2 rounded-[12px] bg-[#F8FAFB] p-3">
                    <p className="text-xs font-black text-[var(--primary)]">
                      {form.specialty} 병과 추천 보직
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {specialtyPreset.positions.map((position) => (
                        <button
                          className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--caption)] transition hover:text-[var(--foreground)]"
                          key={position}
                          type="button"
                          onClick={() => applySpecialtyPreset(position)}
                        >
                          {position}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Field>
              <Field label="복무연수" required>
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
            </div>
          </FormSection>

          <div className="np-divider my-8" />

          <FormSection number="2" title="직무와 전공">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="보직 / 주특기" required>
                <input
                  className="input"
                  value={form.position}
                  onChange={(event) => updateField("position", event.target.value)}
                  placeholder="예: 통신전자장비 정비/운용"
                />
              </Field>
              <Field label="전공" required>
                <input
                  className="input"
                  value={form.major}
                  onChange={(event) => updateField("major", event.target.value)}
                  placeholder="예: 전자공학"
                />
              </Field>
              <Field label="희망 근무지역">
                <input
                  className="input"
                  value={form.preferred_region}
                  onChange={(event) => updateField("preferred_region", event.target.value)}
                  placeholder="예: 서울, 대전, 창원"
                />
              </Field>
              <Field label="희망 방산분야">
                <select
                  className="input"
                  value={form.desired_field}
                  onChange={(event) => updateField("desired_field", event.target.value)}
                >
                  {DEFENSE_FIELDS.map((item, index) => (
                    <option key={item} value={item}>
                      {defenseFieldLabels[index] ?? item}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <div className="np-divider my-8" />

          <FormSection number="3" title="보유 자격증">
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
                placeholder="예: 정보처리기사"
              />
              <button
                className="focus-ring grid h-[46px] w-[52px] shrink-0 place-items-center rounded-[9px] border-[1.5px] border-[#E5E8EB] bg-[#F2F4F6] text-[var(--muted-foreground)]"
                type="button"
                onClick={() => addCertification()}
                aria-label="자격증 추가"
              >
                <Plus size={20} />
              </button>
            </div>
            {specialtyPreset ? (
              <div className="mt-3">
                <p className="text-xs font-black text-[var(--caption)]">추천 자격증 빠른 추가</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {specialtyPreset.certs.map((cert) => (
                    <button
                      className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-black text-[var(--caption)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                      key={cert}
                      type="button"
                      onClick={() => addCertification(cert)}
                    >
                      + {cert}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {certifications.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {certifications.map((cert) => (
                  <span className="np-pill inline-flex items-center gap-1 px-3 py-1" key={cert}>
                    {cert}
                    <button
                      aria-label={`${cert} 삭제`}
                      onClick={() => setCertifications((current) => current.filter((item) => item !== cert))}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </FormSection>

          {error ? (
            <div className="mt-6 rounded-[11px] border border-[#F0C2C2] bg-[#FFF2F2] px-4 py-3 text-sm font-bold text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          <button
            className="focus-ring mt-9 inline-flex h-[64px] w-full items-center justify-center gap-3 rounded-[10px] bg-[#001025d9] px-6 text-xl font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isValid || isLoading}
            type="button"
            onClick={submit}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            방산 커리어 분석하기
          </button>
        </section>

        <p className="mt-5 text-center text-sm font-bold leading-6 text-white drop-shadow">
          입력 정보는 방산 직무 분석과 추천 리포트 생성을 위해서만 사용됩니다.
        </p>
      </div>
    </main>
  );
}

function AnalysisProgressOverlay({ isComplete, progress }: { isComplete: boolean; progress: number }) {
  const roundedProgress = Math.round(progress);
  const messageIndex = Math.min(
    loadingMessages.length - 1,
    Math.floor((roundedProgress / 100) * loadingMessages.length),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(25,31,40,0.46)] px-4 backdrop-blur-[3px]">
      <div className="np-card w-full max-w-[560px] p-8 text-center">
        <div className="mx-auto grid h-[118px] w-[118px] place-items-center rounded-full border-[9px] border-[#EDEFF2] border-r-[var(--primary)] border-t-[var(--primary)]">
          {isComplete ? (
            <CheckCircle2 className="text-[var(--accent)]" size={48} />
          ) : (
            <Loader2 className="animate-spin text-[var(--primary)]" size={48} />
          )}
        </div>
        <h2 className="mt-7 text-2xl font-black">{isComplete ? "리포트 생성 완료" : "분석 진행 중"}</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
          {isComplete ? "결과 화면으로 이동합니다." : loadingMessages[messageIndex]}
        </p>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#EDEFF2]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#9AABC4,#849BBA)] transition-all duration-300"
            style={{ width: `${roundedProgress}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-black text-[var(--primary)]">{roundedProgress}%</p>
      </div>
    </div>
  );
}

function FormSection({
  children,
  number,
  title,
}: {
  children: React.ReactNode;
  number: string;
  title: string;
}) {
  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-[var(--primary)] text-[13px] font-black text-white">
          {number}
        </span>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  children,
  label,
  required,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2 text-[13.5px] font-black text-[var(--muted-foreground)]">
      <span>
        {label} {required ? <span className="text-[var(--required)]">*</span> : null}
      </span>
      {children}
    </div>
  );
}
