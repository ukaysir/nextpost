import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import Papa from "papaparse";
import {
  CareerCenter,
  CareerMapping,
  Company,
  EducationCert,
  IndustryStat,
  JobRequirement,
} from "@/lib/types";
import { normalizeCompanyName } from "@/lib/utils";

const DATA_DIR = path.join(process.cwd(), "데이터파일");

const FILES = {
  mapping: "career_mapping.csv",
  jobs: "job_requirements.csv",
  education: "education_certs.csv",
  companies: "방위사업청_방산업체 지정현황_20250531.csv",
  contracts: "방위사업청_국내조달 계약정보_20251231.csv",
  costCertified: "방위사업청_방산원가관리체계 인증업체 현황_20260506.csv",
  centers: "병무청_병역진로설계지원센터 위치 및 상담예약 안내_20250831.csv",
  industryStats: "방위사업청_방산업체 경영실태_20241231.csv",
  glossary: "방위사업청_국방통합 용어사전_20211231.csv",
};

type CsvRecord = Record<string, string>;

let cache: AppData | null = null;

export type AppData = {
  companies: Company[];
  careerMappings: CareerMapping[];
  jobRequirements: JobRequirement[];
  educationCerts: EducationCert[];
  careerCenters: CareerCenter[];
  industryStats: IndustryStat[];
  glossaryTerms: string;
};

function decodeCsv(fileName: string) {
  const buffer = fs.readFileSync(path.join(DATA_DIR, fileName));
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("�")) return utf8.replace(/^\uFEFF/, "");
  return iconv.decode(buffer, "cp949").replace(/^\uFEFF/, "");
}

function parseCsv(fileName: string): CsvRecord[] {
  const text = decodeCsv(fileName);
  const result = Papa.parse<CsvRecord>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().replace(/^"|"$/g, ""),
    transform: (value) => value.trim(),
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    throw new Error(`${fileName} CSV 파싱 실패: ${first.message}`);
  }

  return result.data;
}

function parseNumber(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseYear(value?: string) {
  if (!value) return undefined;
  const match = value.match(/(20\d{2}|19\d{2})/);
  return match ? Number(match[1]) : undefined;
}

const manualEnrichment: Record<
  string,
  Pick<Company, "careers_page_url" | "avg_salary" | "salary_source">
> = {
  한화시스템: {
    careers_page_url: "https://www.hanwhasystems.com/kr/recruit/recruit.do",
  },
  LIG넥스원: {
    careers_page_url: "https://www.lignex1.com/web/kor/recruit/recruit.jsp",
  },
  한국항공우주산업: {
    careers_page_url: "https://www.koreaaero.com/KO/Recruit/RecruitList.aspx",
  },
  현대로템: {
    careers_page_url: "https://www.hyundai-rotem.co.kr/Recruit/Recruit.asp",
  },
  기아: {
    careers_page_url: "https://career.kia.com/",
  },
  대한항공: {
    careers_page_url: "https://recruit.koreanair.com/",
  },
  풍산: {
    careers_page_url: "https://www.poongsan.co.kr/recruit/recruit.aspx",
  },
  한화에어로스페이스: {
    careers_page_url: "https://www.hanwhaaerospace.co.kr/kor/recruit/recruit.do",
  },
  SNT모티브: {
    careers_page_url: "https://www.sntmotiv.com/kor/careers/recruitment.html",
  },
  STX엔진: {
    careers_page_url: "https://www.stxengine.co.kr/recruit/recruit.aspx",
  },
};

function buildContractIndex() {
  const rows = parseCsv(FILES.contracts);
  const index = new Map<string, { amount: number; recentYear?: number }>();

  for (const row of rows) {
    const rawName = row["대표업체명"];
    if (!rawName) continue;
    const key = normalizeCompanyName(rawName);
    if (!key) continue;

    const current = index.get(key) ?? { amount: 0, recentYear: undefined };
    current.amount += parseNumber(row["총계약금액"] || row["계약금액"]);
    const year = parseYear(row["계약체결일자"]);
    if (year && (!current.recentYear || year > current.recentYear)) {
      current.recentYear = year;
    }
    index.set(key, current);
  }

  return index;
}

function findContractForCompany(
  companyName: string,
  contractIndex: Map<string, { amount: number; recentYear?: number }>,
) {
  const normalized = normalizeCompanyName(companyName);
  const exact = contractIndex.get(normalized);
  if (exact) return exact;

  let best: { amount: number; recentYear?: number } | undefined;
  for (const [candidate, value] of contractIndex.entries()) {
    if (normalized.length < 3 && candidate.length > normalized.length + 2) continue;
    if (candidate.includes(normalized) || normalized.includes(candidate)) {
      if (!best || value.amount > best.amount) best = value;
    }
  }
  return best ?? { amount: 0, recentYear: undefined };
}

function loadCompanies(): Company[] {
  const companyRows = parseCsv(FILES.companies);
  const costCertifiedRows = parseCsv(FILES.costCertified);
  const costCertified = new Set(
    costCertifiedRows.map((row) => normalizeCompanyName(row["업체명"] ?? "")),
  );
  const contractIndex = buildContractIndex();

  return companyRows.map((row, index) => {
    const companyName = (row["업체명"] ?? "").trim();
    const contract = findContractForCompany(companyName, contractIndex);
    const enrichment = manualEnrichment[companyName] ?? {};

    return {
      id: index + 1,
      company_name: companyName,
      defense_field: row["분야"] ?? "기타",
      designation_date: row["지정일자"],
      total_contract_amount: contract.amount,
      recent_contract_year: contract.recentYear,
      is_cost_certified: costCertified.has(normalizeCompanyName(companyName)),
      ...enrichment,
    };
  });
}

function loadCareerMappings(): CareerMapping[] {
  return parseCsv(FILES.mapping).map((row) => ({
    specialty_keyword: row["병과"] ?? "",
    position_keywords: (row["보직/특기 키워드"] ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    defense_field: row["매핑 방산분야"] ?? "기타",
    job_group: row["매핑 직무군"] ?? "사업관리, 품질보증",
  }));
}

function loadJobRequirements(): JobRequirement[] {
  return parseCsv(FILES.jobs).map((row, index) => ({
    id: index + 1,
    defense_field: row["방산분야"] ?? "기타",
    job_title: row["직무명"] ?? "",
    required_skills: (row["요구역량 (하드스킬, 5~8개)"] ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    preferred_military_exp: row["우대 군경력"] ?? "",
    related_weapon_system: row["관련 무기체계"] ?? "",
  }));
}

function loadEducationCerts(): EducationCert[] {
  return parseCsv(FILES.education).map((row, index) => ({
    id: index + 1,
    defense_field: row["방산분야"] ?? "기타",
    job_title: row["관련직무"] ?? "",
    level: row["난이도"] ?? "입문",
    education_name: row["교육명"] ?? "",
    education_provider: row["교육기관"] ?? "",
    education_link: row["교육링크(URL)"] ?? "",
    cert_name: row["추천자격증"] ?? "",
  }));
}

function loadCareerCenters(): CareerCenter[] {
  return parseCsv(FILES.centers).map((row) => ({
    id: parseNumber(row["병역진로센터 순위"]),
    name: row["병역진로센터 명"] ?? "",
    address: `${row["기본 주소"] ?? ""} ${row["상세 주소"] ?? ""}`.trim(),
    phone: row["대표전화번호"] ?? "",
    jurisdiction: row["관할지방청명"] ?? "",
  }));
}

function loadIndustryStats(): IndustryStat[] {
  return parseCsv(FILES.industryStats)
    .map((row) => ({
      year: parseNumber(row["년도"]),
      sales: parseNumber(row["매출액(억원)"]),
      operating_profit_rate: parseNumber(row["방산업체 영업이익율"]),
      raw: row,
    }))
    .filter((item) => item.year > 0);
}

function loadGlossaryTerms() {
  const keywords = ["방산", "무기", "체계", "계약", "품질", "전력", "국산화", "시험평가"];
  return parseCsv(FILES.glossary)
    .filter((row) => {
      const haystack = `${row["표제어"] ?? ""} ${row["분류"] ?? ""} ${row["설명"] ?? ""}`;
      return keywords.some((keyword) => haystack.includes(keyword));
    })
    .slice(0, 120)
    .map((row) => `- ${row["표제어"]}: ${(row["설명"] ?? "").slice(0, 140)}`)
    .join("\n");
}

export function getAppData(): AppData {
  if (cache) return cache;

  cache = {
    companies: loadCompanies(),
    careerMappings: loadCareerMappings(),
    jobRequirements: loadJobRequirements(),
    educationCerts: loadEducationCerts(),
    careerCenters: loadCareerCenters(),
    industryStats: loadIndustryStats(),
    glossaryTerms: loadGlossaryTerms(),
  };

  return cache;
}

export function getLatestIndustryStat() {
  const stats = getAppData().industryStats;
  return [...stats].sort((a, b) => b.year - a.year)[0];
}
