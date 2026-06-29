"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
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

const commonYearsServed = [3, 5, 7, 10, 15, 20];
const commonMajors = [
  "전자공학",
  "정보통신공학",
  "컴퓨터공학",
  "기계공학",
  "전기공학",
  "항공우주공학",
  "산업공학",
  "경영학",
];
const commonRegions = ["서울", "대전", "성남", "판교", "창원", "구미", "사천", "부산"];
const commonCertifications = [
  "정보처리기사",
  "무선설비기사",
  "정보통신기사",
  "정보보안기사",
  "SQLD",
  "전자기사",
  "품질경영기사",
  "일반기계기사",
  "자동차정비기사",
  "산업안전기사",
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

const commonPositions = Array.from(
  new Set(Object.values(specialtyPresets).flatMap((preset) => preset.positions)),
);
const desiredFieldOptions = DEFENSE_FIELDS.map((value, index) => ({
  value,
  label: defenseFieldLabels[index] ?? value,
}));


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
  const positionSuggestions = useMemo(
    () => Array.from(new Set([...(specialtyPreset?.positions ?? []), ...commonPositions])).slice(0, 12),
    [specialtyPreset],
  );
  const certificationSuggestions = useMemo(
    () => Array.from(new Set([...(specialtyPreset?.certs ?? []), ...commonCertifications])).slice(0, 12),
    [specialtyPreset],
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

  function setSpecialtyValue(specialty: string) {
    const preset = specialtyPresets[specialty];
    setForm((current) => ({
      ...current,
      specialty,
      desired_field: preset?.field ?? current.desired_field,
      position: preset?.positions[0] ?? current.position,
    }));
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

      <header className="page-shell flex items-center py-5 text-white md:py-7">
        <Link className="text-[20px] font-black tracking-[1px] drop-shadow md:text-[22px]" href="/">
          NEXTPOST
        </Link>
        <nav className="ml-auto flex items-center gap-3 text-xs font-extrabold drop-shadow md:gap-5 md:text-sm">
          <Link href="/">홈으로</Link>
          <AuthMenu compact />
        </nav>
      </header>

      <div className="mx-auto max-w-[420px] px-3 pb-12 pt-2 sm:max-w-[920px] sm:px-4 md:pb-14 md:pt-3">
        <div className="text-center text-white">
          <h1 className="max-w-full text-[30px] font-black leading-tight tracking-normal drop-shadow sm:text-4xl md:text-5xl">
            <span className="sm:hidden">군 경력 입력</span>
            <span className="hidden sm:inline">군 경력 정보를 입력하세요</span>
          </h1>
        </div>

        <section className="np-card mt-6 p-4 md:mt-7 md:p-7">
          <FormSection number="1" title="기본 군 정보">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="군별" required>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {branchOptions.map((branch) => {
                    const selected = form.military_branch === branch.value;
                    return (
                      <button
                        className={`focus-ring h-[40px] rounded-[9px] border-[1.5px] text-sm font-extrabold md:h-[42px] ${
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
                <QuickPickButtons
                  items={ranks.map((item) => ({ value: item }))}
                  selected={form.rank}
                  onPick={(value) => updateField("rank", value)}
                />
              </Field>
              <Field label="병과" required>
                <input
                  className="input"
                  list="specialty-options"
                  value={form.specialty}
                  onChange={(event) => setSpecialtyValue(event.target.value)}
                  placeholder="예: 통신, 전산, 항공"
                />
                <datalist id="specialty-options">
                  {specialties.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <QuickPickButtons
                  items={specialties.map((item) => ({ value: item }))}
                  selected={form.specialty}
                  onPick={setSpecialtyValue}
                />
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
                <QuickPickButtons
                  items={commonYearsServed.map((item) => ({ value: String(item), label: `${item}년` }))}
                  selected={String(form.years_served)}
                  onPick={(value) => updateField("years_served", Number(value))}
                />
              </Field>
              {specialtyPreset ? (
                <div className="rounded-[12px] bg-[#F8FAFB] px-3 py-2 md:col-span-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 w-full text-xs font-black text-[var(--primary)] sm:w-auto">
                      {form.specialty} 추천 보직
                    </span>
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
            </div>
          </FormSection>

          <div className="np-divider my-6" />

          <FormSection number="2" title="직무와 전공">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="보직 / 주특기" required>
                <input
                  className="input"
                  list="position-options"
                  value={form.position}
                  onChange={(event) => updateField("position", event.target.value)}
                  placeholder="예: 통신전자장비 정비/운용"
                />
                <datalist id="position-options">
                  {positionSuggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <QuickPickButtons
                  items={positionSuggestions.map((item) => ({ value: item }))}
                  selected={form.position}
                  onPick={(value) => updateField("position", value)}
                />
              </Field>
              <Field label="전공" required>
                <input
                  className="input"
                  list="major-options"
                  value={form.major}
                  onChange={(event) => updateField("major", event.target.value)}
                  placeholder="예: 전자공학"
                />
                <datalist id="major-options">
                  {commonMajors.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <QuickPickButtons
                  items={commonMajors.map((item) => ({ value: item }))}
                  selected={form.major}
                  onPick={(value) => updateField("major", value)}
                />
              </Field>
              <Field label="희망 근무지역">
                <input
                  className="input"
                  list="region-options"
                  value={form.preferred_region}
                  onChange={(event) => updateField("preferred_region", event.target.value)}
                  placeholder="예: 서울, 대전, 창원"
                />
                <datalist id="region-options">
                  {commonRegions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <QuickPickButtons
                  items={commonRegions.map((item) => ({ value: item }))}
                  selected={form.preferred_region}
                  onPick={(value) => updateField("preferred_region", value)}
                />
              </Field>
              <Field label="희망 방산분야">
                <select
                  className="input"
                  value={form.desired_field}
                  onChange={(event) => updateField("desired_field", event.target.value)}
                >
                  {desiredFieldOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <QuickPickButtons
                  items={desiredFieldOptions}
                  selected={form.desired_field}
                  onPick={(value) => updateField("desired_field", value)}
                />
              </Field>
            </div>
          </FormSection>

          <div className="np-divider my-6" />

          <FormSection number="3" title="보유 자격증">
            <div className="flex gap-2">
              <input
                className="input"
                list="certification-options"
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
              <datalist id="certification-options">
                {certificationSuggestions.map((cert) => (
                  <option key={cert} value={cert} />
                ))}
              </datalist>
              <button
                className="focus-ring grid h-[44px] w-[50px] shrink-0 place-items-center rounded-[9px] border-[1.5px] border-[#E5E8EB] bg-[#F2F4F6] text-[var(--muted-foreground)]"
                type="button"
                onClick={() => addCertification()}
                aria-label="자격증 추가"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="mt-3">
              <p className="text-xs font-black text-[var(--caption)]">자주 선택하는 자격증</p>
              <QuickPickButtons
                items={certificationSuggestions.map((cert) => ({ value: cert, label: `+ ${cert}` }))}
                selectedValues={certifications}
                onPick={addCertification}
              />
            </div>
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
            className="focus-ring mt-6 inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-[10px] bg-[#001025d9] px-5 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-50 md:mt-7 md:h-[56px] md:px-6 md:text-lg"
            disabled={!isValid || isLoading}
            type="button"
            onClick={submit}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            방산 커리어 분석하기
          </button>
        </section>

        <p className="mt-4 text-center text-xs font-bold leading-5 text-white drop-shadow md:mt-5 md:text-sm md:leading-6">
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
      <div className="np-card w-full max-w-[560px] p-6 text-center md:p-8">
        <div className="mx-auto grid h-[96px] w-[96px] place-items-center rounded-full border-[8px] border-[#EDEFF2] border-r-[var(--primary)] border-t-[var(--primary)] md:h-[118px] md:w-[118px] md:border-[9px]">
          {isComplete ? (
            <CheckCircle2 className="text-[var(--accent)]" size={48} />
          ) : (
            <Loader2 className="animate-spin text-[var(--primary)]" size={48} />
          )}
        </div>
        <h2 className="mt-5 text-xl font-black md:mt-7 md:text-2xl">{isComplete ? "리포트 생성 완료" : "분석 진행 중"}</h2>
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
      <div className="mb-3 flex items-center gap-2 md:mb-4 md:gap-3">
        <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-[var(--primary)] text-[13px] font-black text-white">
          {number}
        </span>
        <h2 className="text-base font-black md:text-lg">{title}</h2>
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
    <div className="grid gap-1.5 text-[13px] font-black text-[var(--muted-foreground)] md:gap-2 md:text-[13.5px]">
      <span>
        {label} {required ? <span className="text-[var(--required)]">*</span> : null}
      </span>
      {children}
    </div>
  );
}

type QuickPickItem = {
  value: string;
  label?: string;
};

function QuickPickButtons({
  items,
  onPick,
  selected,
  selectedValues,
}: {
  items: QuickPickItem[];
  onPick: (value: string) => void;
  selected?: string;
  selectedValues?: string[];
}) {
  const selectedSet = new Set(selectedValues ?? []);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = item.value === selected || selectedSet.has(item.value);
        return (
          <button
            className={`rounded-full border px-3 py-1 text-xs font-black transition ${
              isActive
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                : "border-[var(--border)] bg-white text-[var(--caption)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
            }`}
            key={item.value}
            type="button"
            onClick={() => onPick(item.value)}
          >
            {item.label ?? item.value}
          </button>
        );
      })}
    </div>
  );
}
