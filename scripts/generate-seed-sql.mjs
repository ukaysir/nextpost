import fs from "node:fs";
import path from "node:path";
import iconv from "iconv-lite";
import Papa from "papaparse";

const root = process.cwd();
const dataDir = path.join(root, "데이터파일");
const outDir = path.join(root, "supabase", "seed_chunks");

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

function sql(value) {
  if (value === undefined || value === null || value === "") return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlArray(values) {
  return `array[${values.map(sql).join(",")}]::text[]`;
}

function jsonSql(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
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

function insertStatement(table, columns, rows) {
  if (!rows.length) return "";
  const values = rows
    .map((row) => `(${columns.map((column) => row[column]).join(",")})`)
    .join(",\n");
  return `insert into public.${table} (${columns.join(", ")}) values\n${values};`;
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

const contractIndex = buildContractIndex();
const certified = new Set(parseCsv(files.costCertified).map((row) => normalizeCompanyName(row["업체명"])));

const companies = parseCsv(files.companies).map((row, index) => {
  const name = row["업체명"]?.trim();
  const contract = findContract(name, contractIndex);
  const enrichment = manualEnrichment[name] ?? {};
  return {
    id: sql(index + 1),
    company_name: sql(name),
    defense_field: sql(row["분야"] || "기타"),
    designation_date: sql(row["지정일자"]),
    total_contract_amount: sql(contract.amount),
    recent_contract_year: sql(contract.recentYear),
    is_cost_certified: sql(certified.has(normalizeCompanyName(name))),
    careers_page_url: sql(enrichment.careers_page_url),
    avg_salary: sql(enrichment.avg_salary),
    salary_source: sql(enrichment.salary_source),
  };
});

const jobs = parseCsv(files.jobs).map((row, index) => ({
  id: sql(index + 1),
  defense_field: sql(row["방산분야"] || "기타"),
  job_title: sql(row["직무명"]),
  required_skills: sqlArray((row["요구역량 (하드스킬, 5~8개)"] || "").split(",").map((item) => item.trim()).filter(Boolean)),
  preferred_military_exp: sql(row["우대 군경력"]),
  related_weapon_system: sql(row["관련 무기체계"]),
}));

const educations = parseCsv(files.education).map((row, index) => ({
  id: sql(index + 1),
  defense_field: sql(row["방산분야"] || "기타"),
  job_title: sql(row["관련직무"]),
  level: sql(row["난이도"] || "입문"),
  education_name: sql(row["교육명"]),
  education_provider: sql(row["교육기관"]),
  education_link: sql(row["교육링크(URL)"]),
  cert_name: sql(row["추천자격증"]),
}));

const mappings = parseCsv(files.mapping).map((row) => ({
  specialty_keyword: sql(row["병과"]),
  position_keywords: sqlArray((row["보직/특기 키워드"] || "").split(",").map((item) => item.trim()).filter(Boolean)),
  defense_field: sql(row["매핑 방산분야"] || "기타"),
  job_group: sql(row["매핑 직무군"]),
}));

const centers = parseCsv(files.centers).map((row) => ({
  id: sql(parseNumber(row["병역진로센터 순위"])),
  name: sql(row["병역진로센터 명"]),
  address: sql(`${row["기본 주소"] ?? ""} ${row["상세 주소"] ?? ""}`.trim()),
  phone: sql(row["대표전화번호"]),
  jurisdiction: sql(row["관할지방청명"]),
}));

const industryStats = parseCsv(files.industryStats).map((row) => ({
  year: sql(parseNumber(row["년도"])),
  sales: sql(parseNumber(row["매출액(억원)"])),
  operating_profit_rate: sql(parseNumber(row["방산업체 영업이익율"])),
  raw: jsonSql(row),
}));

const glossaryKeywords = ["방산", "무기", "체계", "계약", "품질", "전력", "국산화", "시험평가"];
const glossaryTerms = parseCsv(files.glossary)
  .filter((row) => {
    const haystack = `${row["표제어"] ?? ""} ${row["분류"] ?? ""} ${row["설명"] ?? ""}`;
    return glossaryKeywords.some((keyword) => haystack.includes(keyword));
  })
  .slice(0, 120)
  .map((row, index) => ({
    id: sql(index + 1),
    term: sql(row["표제어"]),
    description: sql((row["설명"] ?? "").slice(0, 500)),
  }));

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const chunks = [
  ...chunk(companies, 40).map((rows) =>
    insertStatement("companies", ["id", "company_name", "defense_field", "designation_date", "total_contract_amount", "recent_contract_year", "is_cost_certified", "careers_page_url", "avg_salary", "salary_source"], rows),
  ),
  ...chunk(jobs, 40).map((rows) =>
    insertStatement("job_requirements", ["id", "defense_field", "job_title", "required_skills", "preferred_military_exp", "related_weapon_system"], rows),
  ),
  ...chunk(educations, 40).map((rows) =>
    insertStatement("education_certs", ["id", "defense_field", "job_title", "level", "education_name", "education_provider", "education_link", "cert_name"], rows),
  ),
  ...chunk(mappings, 40).map((rows) =>
    insertStatement("career_mapping", ["specialty_keyword", "position_keywords", "defense_field", "job_group"], rows),
  ),
  insertStatement("career_centers", ["id", "name", "address", "phone", "jurisdiction"], centers),
  insertStatement("industry_stats", ["year", "sales", "operating_profit_rate", "raw"], industryStats),
  ...chunk(glossaryTerms, 40).map((rows) =>
    insertStatement("glossary_terms", ["id", "term", "description"], rows),
  ),
].filter(Boolean);

chunks.forEach((content, index) => {
  fs.writeFileSync(path.join(outDir, `${String(index + 1).padStart(3, "0")}.sql`), `${content}\n`, "utf8");
});

console.log(JSON.stringify({
  outDir,
  chunks: chunks.length,
  counts: {
    companies: companies.length,
    jobs: jobs.length,
    educations: educations.length,
    mappings: mappings.length,
    centers: centers.length,
    industryStats: industryStats.length,
    glossaryTerms: glossaryTerms.length,
  },
}, null, 2));
