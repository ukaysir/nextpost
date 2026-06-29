"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { AuthMenu } from "@/components/auth-menu";
import { DEFENSE_FIELDS } from "@/lib/types";

const branchOptions = ["육군", "해군", "공군", "해병대"];

const ranks = [
  "병장",
  "하사",
  "중사",
  "상사",
  "원사",
  "준위",
  "소위",
  "중위",
  "대위",
  "소령",
  "중령",
  "대령",
  "준장",
];

const specialties = [
  "보병",
  "기갑",
  "포병",
  "방공",
  "공병",
  "정보",
  "정보통신",
  "통신",
  "전산",
  "사이버",
  "항공",
  "항공정비",
  "항공통제",
  "UAV/드론",
  "전탐",
  "전자전",
  "함정",
  "기관",
  "병기",
  "탄약",
  "군수",
  "병참",
  "수송",
  "정비",
  "화생방",
  "의무",
  "행정",
  "품질/검사",
  "기타",
];

const desiredFieldOptions = [
  { value: "항공유도", label: "항공유도", detail: "유도무기, 항공전자, UAV, MRO, 위성/우주" },
  { value: "통신전자", label: "통신전자", detail: "C4I, 레이더, 전자전, 국방SW, 사이버/네트워크" },
  { value: "기동", label: "기동", detail: "전차, 장갑차, 차량, 유압/동력, 기동장비 정비" },
  { value: "함정", label: "함정", detail: "함정 전투체계, 기관/전기, 소나, 해양무기체계" },
  { value: "화력", label: "화력", detail: "화포, 사격통제, 탄도, 표적탐지, 발사체계" },
  { value: "탄약", label: "탄약", detail: "탄약, 추진제, 무장, 저장/안전, 품질검사" },
  { value: "화생방", label: "화생방", detail: "탐지, 제독, 방호, 보호장비, 환경시험" },
  { value: "기타", label: "기타", detail: "방산 영업, 사업관리, 구매, 원가, 품질보증" },
].filter((item) => DEFENSE_FIELDS.includes(item.value as (typeof DEFENSE_FIELDS)[number]));

const commonMajors = [
  "전자공학",
  "전기공학",
  "정보통신공학",
  "컴퓨터공학",
  "소프트웨어공학",
  "사이버보안학",
  "데이터사이언스",
  "기계공학",
  "자동차공학",
  "메카트로닉스공학",
  "제어계측공학",
  "항공우주공학",
  "무인항공시스템학",
  "조선해양공학",
  "재료공학",
  "금속공학",
  "화학공학",
  "환경공학",
  "산업공학",
  "품질경영학",
  "물류학",
  "경영학",
  "국방시스템공학",
  "방위사업학",
];

const commonRegions = [
  "서울",
  "경기 성남/판교",
  "경기 용인",
  "경기 수원",
  "경기 안양",
  "경기 평택",
  "인천",
  "대전",
  "세종",
  "충남 논산/계룡",
  "충남 천안/아산",
  "충북 청주",
  "경남 창원",
  "경남 사천",
  "경남 진주",
  "부산",
  "울산",
  "대구",
  "경북 구미",
  "경북 경주",
  "전북 전주/익산",
  "전남 여수/광양",
  "광주",
  "강원 원주/춘천",
];

const commonCertifications = [
  "정보처리기사",
  "정보보안기사",
  "정보통신기사",
  "무선설비기사",
  "전파전자통신기사",
  "전자기사",
  "전기기사",
  "임베디드기사",
  "빅데이터분석기사",
  "SQLD",
  "네트워크관리사",
  "리눅스마스터",
  "CISSP",
  "산업안전기사",
  "품질경영기사",
  "일반기계기사",
  "기계설계기사",
  "건설기계설비기사",
  "자동차정비기사",
  "항공기사",
  "항공산업기사",
  "항공정비사",
  "초경량비행장치 조종자",
  "비파괴검사기사",
  "화공기사",
  "화약류관리기사",
  "위험물산업기사",
  "대기환경기사",
  "수질환경기사",
  "소방설비기사",
  "물류관리사",
  "CPIM",
  "PMP",
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
    positions: ["전술통신망 운용", "무전/위성통신 운용", "C4I 운용", "암호장비 운용", "통신전자장비 정비"],
    skills: ["무선통신", "네트워크", "안테나", "암호장비", "장비정비"],
    certs: ["정보통신기사", "무선설비기사", "전파전자통신기사", "정보처리기사"],
  },
  정보통신: {
    field: "통신전자",
    positions: ["정보통신체계 운용", "전술데이터링크 운용", "네트워크/서버 관리", "암호체계 운용"],
    skills: ["C4ISR", "네트워크", "보안", "DB", "서버"],
    certs: ["정보처리기사", "정보보안기사", "정보통신기사", "네트워크관리사"],
  },
  전산: {
    field: "통신전자",
    positions: ["전산체계 운용", "정보체계 관리", "DB/서버 관리", "보안관제", "국방망 운영"],
    skills: ["소프트웨어", "DB", "보안", "클라우드", "Linux"],
    certs: ["정보처리기사", "SQLD", "정보보안기사", "리눅스마스터"],
  },
  사이버: {
    field: "통신전자",
    positions: ["사이버작전 지원", "침해대응/보안관제", "네트워크 보안", "취약점 진단", "암호/인증체계 운용"],
    skills: ["보안관제", "네트워크", "로그분석", "취약점 진단", "암호"],
    certs: ["정보보안기사", "CISSP", "리눅스마스터", "네트워크관리사"],
  },
  정보: {
    field: "통신전자",
    positions: ["정보분석", "신호정보(SIGINT)", "영상정보(IMINT)", "감시정찰(ISR)", "표적정보 분석"],
    skills: ["데이터 분석", "GIS", "신호처리", "영상판독", "ISR"],
    certs: ["빅데이터분석기사", "정보처리기사", "SQLD", "전파전자통신기사"],
  },
  전탐: {
    field: "통신전자",
    positions: ["레이더 운용", "전탐장비 정비", "소나/수중감시 운용", "전자전(EW) 운용"],
    skills: ["레이더", "RF", "신호처리", "소나", "전자전"],
    certs: ["전자기사", "무선설비기사", "전파전자통신기사", "품질경영기사"],
  },
  전자전: {
    field: "통신전자",
    positions: ["전자전 장비 운용", "ES/EA 장비 정비", "RF 신호분석", "전파감시"],
    skills: ["RF", "안테나", "신호처리", "전자기학", "FPGA"],
    certs: ["전자기사", "전파전자통신기사", "무선설비기사", "정보처리기사"],
  },
  항공: {
    field: "항공유도",
    positions: ["항공정비", "항공전자 운용", "항공관제", "무인체계 운용", "비행시험 지원"],
    skills: ["항공전자", "센서", "정비", "감항", "품질"],
    certs: ["항공기사", "항공산업기사", "전자기사", "품질경영기사"],
  },
  항공정비: {
    field: "항공유도",
    positions: ["기체정비", "엔진정비", "항전정비", "군수정비", "비파괴검사(NDT)"],
    skills: ["정비교범", "기계", "항전", "NDT", "형상관리"],
    certs: ["항공정비사", "항공산업기사", "비파괴검사기사", "품질경영기사"],
  },
  항공통제: {
    field: "통신전자",
    positions: ["방공통제", "항공관제", "레이더 감시", "전술항공통제", "표적식별"],
    skills: ["레이더", "항공교통", "전술데이터", "상황판단", "통신"],
    certs: ["전파전자통신기사", "무선설비기사", "정보처리기사", "전자기사"],
  },
  "UAV/드론": {
    field: "항공유도",
    positions: ["무인기 운용", "드론 정비", "임무장비 운용", "지상통제장비 운용", "영상정보 분석"],
    skills: ["UAV", "데이터링크", "센서융합", "ROS", "임베디드"],
    certs: ["초경량비행장치 조종자", "무선설비기사", "정보처리기사", "전자기사"],
  },
  방공: {
    field: "항공유도",
    positions: ["방공포병 운용", "유도탄 정비", "방공레이더 운용", "표적탐지/식별", "사격통제"],
    skills: ["유도무기", "레이더", "사격통제", "표적식별", "정비"],
    certs: ["전자기사", "전파전자통신기사", "품질경영기사", "정보처리기사"],
  },
  포병: {
    field: "화력",
    positions: ["화력장비 운용", "사격지휘", "사격통제", "탄도/표적 분석", "대포병레이더 연동"],
    skills: ["사격통제", "탄도", "센서", "기계", "데이터 분석"],
    certs: ["기계설계기사", "전자기사", "정보처리기사", "품질경영기사"],
  },
  기갑: {
    field: "기동",
    positions: ["전차 운용", "장갑차 정비", "기동장비 운용", "차량 정비", "포탑/사격통제 정비"],
    skills: ["기계", "정비", "유압", "동력전달", "품질"],
    certs: ["일반기계기사", "자동차정비기사", "건설기계설비기사", "품질경영기사"],
  },
  정비: {
    field: "기동",
    positions: ["차량정비", "궤도장비 정비", "발전기/동력장치 정비", "창정비", "검사/품질"],
    skills: ["정비", "검사", "고장진단", "유압", "안전"],
    certs: ["자동차정비기사", "일반기계기사", "산업안전기사", "품질경영기사"],
  },
  공병: {
    field: "기동",
    positions: ["전투공병장비 운용", "장애물 개척장비 운용", "건설장비 정비", "폭파/장애물 처리"],
    skills: ["건설기계", "유압", "구조", "안전", "장비운용"],
    certs: ["건설기계설비기사", "산업안전기사", "일반기계기사", "품질경영기사"],
  },
  함정: {
    field: "함정",
    positions: ["함정 전투체계 운용", "함정기관 운용", "함정전기 정비", "소나/전탐 운용", "함포/유도탄 운용"],
    skills: ["전투체계", "기관", "전기", "소나", "정비"],
    certs: ["전기기사", "전자기사", "일반기계기사", "품질경영기사"],
  },
  기관: {
    field: "함정",
    positions: ["함정기관 운용", "가스터빈/디젤기관 정비", "추진체계 정비", "보조기계 운용"],
    skills: ["기관", "유체", "동력", "정비", "안전"],
    certs: ["일반기계기사", "건설기계설비기사", "산업안전기사", "품질경영기사"],
  },
  병기: {
    field: "탄약",
    positions: ["무장 정비", "창정비", "탄약/무기 검사", "총포/화기 정비", "품질검사"],
    skills: ["정비", "품질", "안전", "검사", "무장"],
    certs: ["화약류관리기사", "품질경영기사", "산업안전기사", "일반기계기사"],
  },
  탄약: {
    field: "탄약",
    positions: ["탄약관리", "탄약검사", "저장/안전관리", "폭발물 처리 지원", "추진제/화공 관리"],
    skills: ["탄약", "화공", "안전관리", "품질검사", "위험물"],
    certs: ["화약류관리기사", "위험물산업기사", "화공기사", "산업안전기사"],
  },
  화생방: {
    field: "화생방",
    positions: ["화생방 탐지", "제독장비 운용", "방호장비 관리", "환경/시료 분석", "연막/소독 장비 운용"],
    skills: ["분석화학", "센서", "제독", "방호", "환경시험"],
    certs: ["화공기사", "대기환경기사", "수질환경기사", "산업안전기사"],
  },
  군수: {
    field: "기타",
    positions: ["군수관리", "정비보급", "수리부속 관리", "계약/구매 지원", "창정비 계획"],
    skills: ["물류", "원가", "구매", "재고관리", "사업관리"],
    certs: ["물류관리사", "CPIM", "PMP", "품질경영기사"],
  },
  병참: {
    field: "기타",
    positions: ["보급관리", "물자관리", "급식/피복 보급", "재고/창고 관리", "조달 지원"],
    skills: ["물류", "재고", "구매", "프로세스", "원가"],
    certs: ["물류관리사", "CPIM", "산업안전기사", "품질경영기사"],
  },
  수송: {
    field: "기동",
    positions: ["차량운용", "수송계획", "특수차량 정비", "물류운송 관리", "장비 배차/정비"],
    skills: ["차량", "정비", "물류", "안전", "운송계획"],
    certs: ["자동차정비기사", "물류관리사", "산업안전기사", "일반기계기사"],
  },
  "품질/검사": {
    field: "기타",
    positions: ["품질보증", "수입검사", "시험평가 지원", "형상관리", "협력사 품질관리"],
    skills: ["품질", "검사", "시험", "형상관리", "문서화"],
    certs: ["품질경영기사", "산업안전기사", "비파괴검사기사", "PMP"],
  },
};

const allPositions = Array.from(
  new Set(Object.values(specialtyPresets).flatMap((preset) => preset.positions)),
).sort((a, b) => a.localeCompare(b, "ko-KR"));

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

type SectionKey = "military" | "career" | "certifications";
type SelectOption = {
  value: string;
  label?: string;
  detail?: string;
};

const yearOptions = Array.from({ length: 30 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}년`,
}));

function toOptions(values: string[]): SelectOption[] {
  return values.map((value) => ({ value }));
}

export function AnalyzeForm() {
  const router = useRouter();
  const [form, setForm] = useState<AnalyzeFormState>({
    military_branch: "육군",
    rank: "대위",
    specialty: "정보",
    position: "신호정보(SIGINT)",
    years_served: 7,
    major: "전자공학",
    desired_field: "통신전자",
    preferred_region: "대전",
  });
  const [certInput, setCertInput] = useState("정보처리기사");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    military: true,
    career: false,
    certifications: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  const specialtyPreset = specialtyPresets[form.specialty];
  const positionSuggestions = useMemo(
    () => Array.from(new Set([...(specialtyPreset?.positions ?? []), ...allPositions])),
    [specialtyPreset],
  );
  const certificationSuggestions = useMemo(
    () =>
      Array.from(new Set([...(specialtyPreset?.certs ?? []), ...commonCertifications])).sort((a, b) =>
        a.localeCompare(b, "ko-KR"),
      ),
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

  function toggleSection(key: SectionKey) {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  }

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
    setCertifications((current) => [...current, value].slice(0, 12));
    if (nextValue === certInput) setCertInput("");
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

      <div className="mx-auto max-w-[440px] px-3 pb-12 pt-2 sm:max-w-[1080px] sm:px-5 md:pb-14 md:pt-3">
        <div className="text-center text-white">
          <h1 className="max-w-full text-[30px] font-black leading-tight tracking-normal drop-shadow sm:text-4xl md:text-5xl">
            <span className="sm:hidden">군 경력 입력</span>
            <span className="hidden sm:inline">군 경력 정보를 입력하세요</span>
          </h1>
        </div>

        <section className="np-card mt-6 p-4 md:mt-7 md:p-7">
          <FormSection
            isOpen={openSections.military}
            number="1"
            summary={`${form.military_branch} · ${form.rank} · ${form.specialty} · ${form.years_served || "-"}년`}
            title="기본 군 정보"
            onToggle={() => toggleSection("military")}
          >
            <div className="grid gap-4 md:grid-cols-[0.85fr_0.85fr_1.25fr_0.65fr]">
              <Field label="군별" required>
                <OptionPicker
                  options={toOptions(branchOptions)}
                  selected={form.military_branch}
                  onSelect={(value) => updateField("military_branch", value)}
                />
              </Field>
              <Field label="계급" required>
                <OptionPicker
                  options={toOptions(ranks)}
                  selected={form.rank}
                  onSelect={(value) => updateField("rank", value)}
                />
              </Field>
              <Field label="병과" required>
                <OptionPicker
                  maxListHeight="max-h-[280px]"
                  options={toOptions(specialties)}
                  selected={form.specialty}
                  onSelect={setSpecialtyValue}
                />
              </Field>
              <Field label="복무연수" required>
                <OptionPicker
                  maxListHeight="max-h-[260px]"
                  options={yearOptions}
                  selected={String(form.years_served)}
                  onSelect={(value) => updateField("years_served", Number(value))}
                />
              </Field>
            </div>
          </FormSection>

          <div className="np-divider my-4 md:my-5" />

          <FormSection
            isOpen={openSections.career}
            number="2"
            summary={`${form.position} · ${form.major} · ${form.desired_field}`}
            title="직무와 전공"
            onToggle={() => toggleSection("career")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="보직 / 주특기" required>
                <OptionPicker
                  maxListHeight="max-h-[320px]"
                  options={toOptions(positionSuggestions)}
                  selected={form.position}
                  onSelect={(value) => updateField("position", value)}
                />
              </Field>
              <Field label="전공" required>
                <OptionPicker
                  maxListHeight="max-h-[300px]"
                  options={toOptions(commonMajors)}
                  selected={form.major}
                  onSelect={(value) => updateField("major", value)}
                />
              </Field>
              <Field label="희망 근무지역">
                <OptionPicker
                  maxListHeight="max-h-[300px]"
                  options={toOptions(commonRegions)}
                  selected={form.preferred_region}
                  onSelect={(value) => updateField("preferred_region", value)}
                />
              </Field>
              <Field label="희망 방산분야">
                <OptionPicker
                  maxListHeight="max-h-[320px]"
                  options={desiredFieldOptions}
                  selected={form.desired_field}
                  onSelect={(value) => updateField("desired_field", value)}
                />
              </Field>
            </div>
          </FormSection>

          <div className="np-divider my-4 md:my-5" />

          <FormSection
            isOpen={openSections.certifications}
            number="3"
            summary={certifications.length ? `${certifications.length}개 등록` : "선택 사항"}
            title="보유 자격증"
            onToggle={() => toggleSection("certifications")}
          >
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <OptionPicker
                maxListHeight="max-h-[320px]"
                options={toOptions(certificationSuggestions)}
                placeholder="자격증 선택"
                selected={certInput}
                onSelect={(value) => {
                  setCertInput(value);
                  addCertification(value);
                }}
              />
              <button
                className="focus-ring inline-flex h-[44px] items-center justify-center gap-2 rounded-[9px] border-[1.5px] border-[#DDE3EA] bg-[#F2F4F6] px-4 text-sm font-black text-[var(--muted-foreground)] md:min-w-[104px]"
                type="button"
                onClick={() => addCertification()}
              >
                <Plus size={18} />
                추가
              </button>
            </div>
            {certifications.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {certifications.map((cert) => (
                  <span
                    className="inline-flex min-h-[34px] items-center gap-2 rounded-[7px] border border-[var(--border)] bg-[#F8FAFB] px-3 py-1 text-xs font-extrabold text-[var(--muted-foreground)]"
                    key={cert}
                  >
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
  isOpen,
  number,
  onToggle,
  summary,
  title,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  number: string;
  onToggle: () => void;
  summary: string;
  title: string;
}) {
  return (
    <section>
      <button
        aria-expanded={isOpen}
        className="focus-ring flex min-h-[54px] w-full items-center gap-3 rounded-[9px] px-1 text-left transition hover:bg-[#F8FAFB] md:min-h-[58px] md:px-2"
        type="button"
        onClick={onToggle}
      >
        <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[7px] bg-[var(--primary)] text-[13px] font-black text-white">
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black md:text-lg">{title}</span>
          <span className="mt-0.5 block truncate text-xs font-bold text-[var(--caption)] md:text-[13px]">
            {summary}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-[var(--caption)] transition-transform ${isOpen ? "rotate-180" : ""}`}
          size={22}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className={`min-h-0 ${isOpen ? "overflow-visible" : "overflow-hidden"}`}>
          <div className="pt-4 md:pt-5">{children}</div>
        </div>
      </div>
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

function OptionPicker({
  maxListHeight = "max-h-[240px]",
  onSelect,
  options,
  placeholder = "선택",
  selected,
}: {
  maxListHeight?: string;
  onSelect: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  selected: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomInputOpen, setIsCustomInputOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const selectedOption = options.find((option) => option.value === selected);
  const selectedLabel = (selectedOption?.label ?? selected) || placeholder;

  function closePicker() {
    setIsOpen(false);
    setIsCustomInputOpen(false);
    setCustomValue("");
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  function handleSelect(value: string) {
    onSelect(value);
    closePicker();
  }

  function openCustomInput() {
    setCustomValue(selected && !selectedOption ? selected : "");
    setIsCustomInputOpen(true);
  }

  function submitCustomInput() {
    const value = customValue.trim();
    if (!value) return;
    handleSelect(value);
  }

  return (
    <div>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="focus-ring flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[9px] border-[1.5px] border-[#E5E8EB] bg-[#F9FAFB] px-3 text-left text-[14px] font-extrabold text-[var(--foreground)] transition hover:border-[#D5DCE5]"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="min-w-0">
          <span className="block truncate">{selectedLabel}</span>
          {selectedOption?.detail ? (
            <span className="mt-0.5 block truncate text-[11px] font-bold text-[var(--caption)]">
              {selectedOption.detail}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`shrink-0 text-[var(--caption)] transition-transform ${isOpen ? "rotate-180" : ""}`}
          size={18}
        />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(25,31,40,0.24)] px-3 py-4 backdrop-blur-[2px] sm:items-start sm:py-[11vh]"
          role="presentation"
          onClick={closePicker}
        >
          <div
            aria-modal="true"
            className="w-full max-w-[520px] overflow-hidden rounded-[12px] border border-[var(--border-strong)] bg-white shadow-[0_24px_70px_rgba(25,31,40,0.28)]"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-[54px] items-center gap-3 border-b border-[var(--border)] px-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[var(--foreground)]">{placeholder}</p>
                <p className="truncate text-xs font-bold text-[var(--caption)]">{selectedLabel}</p>
              </div>
              <button
                aria-label="선택 닫기"
                className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[var(--caption)] hover:bg-[#F8FAFB]"
                type="button"
                onClick={closePicker}
              >
                <X size={18} />
              </button>
            </div>

            <div className={`max-h-[62vh] overflow-y-auto p-2 ${maxListHeight}`} role="listbox">
              {isCustomInputOpen ? (
                <div className="grid gap-3 p-2">
                  <label className="grid gap-2 text-sm font-black text-[var(--muted-foreground)]">
                    직접 입력
                    <input
                      autoFocus
                      className="input"
                      placeholder={`${placeholder} 입력`}
                      value={customValue}
                      onChange={(event) => setCustomValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") submitCustomInput();
                      }}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="focus-ring h-11 rounded-[9px] border border-[var(--border-strong)] bg-white text-sm font-black text-[var(--muted-foreground)]"
                      type="button"
                      onClick={() => setIsCustomInputOpen(false)}
                    >
                      목록으로
                    </button>
                    <button
                      className="focus-ring h-11 rounded-[9px] bg-[#001025d9] text-sm font-black text-white disabled:opacity-50"
                      disabled={!customValue.trim()}
                      type="button"
                      onClick={submitCustomInput}
                    >
                      적용
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {options.map((option) => {
                    const isSelected = option.value === selected;
                    return (
                      <button
                        aria-selected={isSelected}
                        className={`focus-ring flex min-h-[42px] w-full items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 text-left text-sm font-extrabold transition ${
                          isSelected
                            ? "bg-[var(--primary-soft)] text-[var(--foreground)]"
                            : "text-[var(--muted-foreground)] hover:bg-[#F8FAFB] hover:text-[var(--foreground)]"
                        }`}
                        key={option.value}
                        role="option"
                        type="button"
                        onClick={() => handleSelect(option.value)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{option.label ?? option.value}</span>
                          {option.detail ? (
                            <span className="mt-0.5 block truncate text-[11px] font-bold text-[var(--caption)]">
                              {option.detail}
                            </span>
                          ) : null}
                        </span>
                        {isSelected ? <span className="h-2.5 w-2.5 shrink-0 rounded-[4px] bg-[var(--primary)]" /> : null}
                      </button>
                    );
                  })}
                  <button
                    aria-selected={false}
                    className="focus-ring mt-1 flex min-h-[42px] w-full items-center gap-3 rounded-[8px] border border-dashed border-[var(--border-strong)] px-3 py-2.5 text-left text-sm font-black text-[var(--muted-foreground)] transition hover:bg-[#F8FAFB] hover:text-[var(--foreground)]"
                    role="option"
                    type="button"
                    onClick={openCustomInput}
                  >
                    <Plus size={17} />
                    직접 입력
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
