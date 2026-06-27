import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import iconv from "iconv-lite";
import Papa from "papaparse";

const root = process.cwd();
const dataDir = path.join(root, "데이터파일");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.");
}

const files = {
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

const manualEnrichment = {
  "한화시스템": {
    careers_page_url: "https://www.hanwhasystems.com/kr/recruit/recruit.do",
  },
  "LIG넥스원": {
    careers_page_url: "https://www.lignex1.com/web/kor/recruit/recruit.jsp",
  },
  "한국항공우주산업": {
    careers_page_url: "https://www.koreaaero.com/KO/Recruit/RecruitList.aspx",
  },
  "현대로템": {
    careers_page_url: "https://www.hyundai-rotem.co.kr/Recruit/Recruit.asp",
  },
  "기아": {
    careers_page_url: "https://career.kia.com/",
  },
  "대한항공": {
    careers_page_url: "https://recruit.koreanair.com/",
  },
  "풍산": {
    careers_page_url: "https://www.poongsan.co.kr/recruit/recruit.aspx",
  },
  "한화에어로스페이스": {
    careers_page_url: "https://www.hanwhaaerospace.co.kr/kor/recruit/recruit.do",
  },
  "SNT모티브": {
    careers_page_url: "https://www.sntmotiv.com/kor/careers/recruitment.html",
  },
  "STX엔진": {
    careers_page_url: "https://www.stxengine.co.kr/recruit/recruit.aspx",
  },
};

function decodeCsv(fileName) {
  const buffer = fs.readFileSync(path.join(dataDir, fileName));
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("�")) return utf8.replace(/^\uFEFF/, "");
  return iconv.decode(buffer, "cp949").replace(/^\uFEFF/, "");
}

function parseCsv(fileName) {
  const result = Papa.parse(decodeCsv(fileName), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().replace(/^"|"$/g, ""),
    transform: (value) => String(value).trim(),
  });
  if (result.errors.length) throw new Error(`${fileName}: ${result.errors[0].message}`);
  return result.data;
}

function normalizeCompanyName(value) {
  return String(value)
    .toLowerCase()
    .replace(/\(주\)|주식회사|㈜|유한회사|재단법인|사단법인/g, "")
    .replace(/[^0-9a-z가-힣]/g, "")
    .trim();
}

function parseNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseYear(value) {
  const match = String(value ?? "").match(/(20\d{2}|19\d{2})/);
  return match ? Number(match[1]) : null;
}

function buildContractIndex() {
  const index = new Map();
  for (const row of parseCsv(files.contracts)) {
    const key = normalizeCompanyName(row["대표업체명"]);
    if (!key) continue;
    const current = index.get(key) ?? { amount: 0, recentYear: null };
    current.amount += parseNumber(row["총계약금액"] || row["계약금액"]);
    const year = parseYear(row["계약체결일자"]);
    if (year && (!current.recentYear || year > current.recentYear)) current.recentYear = year;
    index.set(key, current);
  }
  return index;
}

function findContract(companyName, contractIndex) {
  const normalized = normalizeCompanyName(companyName);
  if (contractIndex.has(normalized)) return contractIndex.get(normalized);
  let best = null;
  for (const [candidate, value] of contractIndex.entries()) {
    if (normalized.length < 3 && candidate.length > normalized.length + 2) continue;
    if (candidate.includes(normalized) || normalized.includes(candidate)) {
      if (!best || value.amount > best.amount) best = value;
    }
  }
  return best ?? { amount: 0, recentYear: null };
}

function compactArray(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function insertChunks(client, table, rows, size = 250) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const { error } = await client.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
  return rows.length;
}

const contractIndex = buildContractIndex();
const certified = new Set(parseCsv(files.costCertified).map((row) => normalizeCompanyName(row["업체명"])));
const companies = parseCsv(files.companies).map((row, index) => {
  const companyName = row["업체명"]?.trim();
  const contract = findContract(companyName, contractIndex);
  const enrichment = manualEnrichment[companyName] ?? {};
  return {
    id: index + 1,
    company_name: companyName,
    defense_field: row["분야"] || "기타",
    designation_date: row["지정일자"] || null,
    total_contract_amount: contract.amount,
    recent_contract_year: contract.recentYear,
    is_cost_certified: certified.has(normalizeCompanyName(companyName)),
    careers_page_url: enrichment.careers_page_url ?? null,
    avg_salary: enrichment.avg_salary ?? null,
    salary_source: enrichment.salary_source ?? null,
  };
});

const jobRequirements = parseCsv(files.jobs).map((row, index) => ({
  id: index + 1,
  defense_field: row["방산분야"] || "기타",
  job_title: row["직무명"],
  required_skills: compactArray(row["요구역량 (하드스킬, 5~8개)"]),
  preferred_military_exp: row["우대 군경력"] || null,
  related_weapon_system: row["관련 무기체계"] || null,
}));

const educationCerts = parseCsv(files.education).map((row, index) => ({
  id: index + 1,
  defense_field: row["방산분야"] || "기타",
  job_title: row["관련직무"] || null,
  level: row["난이도"] || "입문",
  education_name: row["교육명"],
  education_provider: row["교육기관"] || null,
  education_link: row["교육링크(URL)"] || null,
  cert_name: row["추천자격증"] || null,
}));

const careerMappings = parseCsv(files.mapping).map((row) => ({
  specialty_keyword: row["병과"],
  position_keywords: compactArray(row["보직/특기 키워드"]),
  defense_field: row["매핑 방산분야"] || "기타",
  job_group: row["매핑 직무군"] || null,
}));

const careerCenters = parseCsv(files.centers).map((row) => ({
  id: parseNumber(row["병역진로센터 순위"]),
  name: row["병역진로센터 명"],
  address: `${row["기본 주소"] ?? ""} ${row["상세 주소"] ?? ""}`.trim(),
  phone: row["대표전화번호"] || null,
  jurisdiction: row["관할지방청명"] || null,
}));

const industryStats = parseCsv(files.industryStats).map((row) => ({
  year: parseNumber(row["년도"]),
  sales: parseNumber(row["매출액(억원)"]),
  operating_profit_rate: parseNumber(row["방산업체 영업이익율"]),
  raw: row,
}));

const glossaryKeywords = ["방산", "무기", "체계", "계약", "품질", "전력", "국산화", "시험평가"];
const glossaryTerms = parseCsv(files.glossary)
  .filter((row) => {
    const haystack = `${row["표제어"] ?? ""} ${row["분류"] ?? ""} ${row["설명"] ?? ""}`;
    return glossaryKeywords.some((keyword) => haystack.includes(keyword));
  })
  .slice(0, 120)
  .map((row, index) => ({
    id: index + 1,
    term: row["표제어"],
    description: String(row["설명"] ?? "").slice(0, 500),
  }));

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const counts = {};
counts.companies = await insertChunks(client, "companies", companies);
counts.job_requirements = await insertChunks(client, "job_requirements", jobRequirements);
counts.education_certs = await insertChunks(client, "education_certs", educationCerts);
counts.career_mapping = await insertChunks(client, "career_mapping", careerMappings);
counts.career_centers = await insertChunks(client, "career_centers", careerCenters);
counts.industry_stats = await insertChunks(client, "industry_stats", industryStats);
counts.glossary_terms = await insertChunks(client, "glossary_terms", glossaryTerms);

console.log(JSON.stringify(counts, null, 2));
