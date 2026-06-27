import fs from "node:fs";
import path from "node:path";
import iconv from "iconv-lite";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const dataDir = path.join(root, "데이터파일");
const outFile = path.join(root, "supabase", "data_coverage_audit.json");
const useRemote = process.argv.includes("--remote");

const files = {
  companies: "방위사업청_방산업체 지정현황_20250531.csv",
  contracts: "방위사업청_국내조달 계약정보_20251231.csv",
  costCertified: "방위사업청_방산원가관리체계 인증업체 현황_20260506.csv",
  education: "education_certs.csv",
  jobs: "job_requirements.csv",
  mappings: "career_mapping.csv",
};

function readEnvFile() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

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

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\(주\)|주식회사|㈜|유한회사|재단법인|사단법인/g, "")
    .replace(/[^0-9a-z가-힣]/g, "")
    .trim();
}

function normalizeField(value) {
  const field = String(value ?? "").trim();
  if (field === "항공") return "항공유도";
  return field || "기타";
}

function parseLocalEnrichmentIds() {
  const filesToScan = [
    path.join(root, "lib", "company-enrichment.ts"),
    path.join(root, "supabase", "enrichment_careers_overlay.sql"),
  ].filter((filePath) => fs.existsSync(filePath));
  const text = filesToScan.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");
  return new Set(
    Array.from(text.matchAll(/company_id:\s*(\d+)|company_id\s*=\s*(\d+)|\(\s*(\d+),\s*'[^']+'/g))
      .map((match) => Number(match[1] ?? match[2] ?? match[3]))
      .filter(Number.isFinite),
  );
}

function summarizeLocal() {
  const companies = parseCsv(files.companies).map((row, index) => ({
    id: index + 1,
    company_name: row["업체명"],
    defense_field: row["분야"],
  }));
  const contractNames = new Set(parseCsv(files.contracts).map((row) => normalizeName(row["대표업체명"])));
  const certified = new Set(parseCsv(files.costCertified).map((row) => normalizeName(row["업체명"])));
  const education = parseCsv(files.education);
  const jobs = parseCsv(files.jobs);
  const mappings = parseCsv(files.mappings);
  const localEnrichedCompanyIds = parseLocalEnrichmentIds();

  const companiesWithContracts = companies.filter((company) => {
    const normalized = normalizeName(company.company_name);
    return [...contractNames].some(
      (name) => name === normalized || name.includes(normalized) || normalized.includes(name),
    );
  });
  const fieldCounts = companies.reduce((acc, company) => {
    const field = normalizeField(company.defense_field);
    acc[field] = (acc[field] ?? 0) + 1;
    return acc;
  }, {});

  return {
    mode: "local_csv",
    totals: {
      companies: companies.length,
      companies_with_contracts: companiesWithContracts.length,
      cost_certified_companies: companies.filter((company) => certified.has(normalizeName(company.company_name))).length,
      local_enriched_company_ids: localEnrichedCompanyIds.size,
      education_rows: education.length,
      common_education_rows: education.filter((row) => row["방산분야"] === "공통").length,
      job_requirement_rows: jobs.length,
      career_mapping_rows: mappings.length,
      legacy_air_field_rows: companies.filter((company) => company.defense_field === "항공").length,
    },
    field_counts: fieldCounts,
    priority_gaps: [
      "원격 DB 기준 평균연봉/직원수/company_financials는 OpenDART API 키가 있어야 보강 가능합니다.",
      "원격 DB 쓰기 권한이 없으면 enrichment_contract_records_top100.sql과 careers overlay SQL은 적용할 수 없습니다.",
      "로컬 CSV만으로는 원격 company_profiles/company_sources의 최신 커버리지를 증명할 수 없습니다. 가능하면 --remote로 재감사하세요.",
    ],
  };
}

async function fetchAll(client, table, select = "*") {
  const { data, error } = await client.from(table).select(select);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

async function summarizeRemote() {
  const env = { ...readEnvFile(), ...process.env };
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for --remote.");
  }

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [
    companies,
    profiles,
    sources,
    contracts,
    postings,
    financials,
    education,
    jobs,
    mappings,
  ] = await Promise.all([
    fetchAll(client, "companies"),
    fetchAll(client, "company_profiles"),
    fetchAll(client, "company_sources"),
    fetchAll(client, "contract_records"),
    fetchAll(client, "job_postings"),
    fetchAll(client, "company_financials"),
    fetchAll(client, "education_certs"),
    fetchAll(client, "job_requirements"),
    fetchAll(client, "career_mapping"),
  ]);

  const profileByCompany = new Map(profiles.map((profile) => [profile.company_id, profile]));
  const contractCompanyIds = new Set(contracts.map((contract) => contract.company_id).filter(Boolean));
  const sourceCompanyIds = new Set(sources.map((source) => source.company_id));
  const postingCompanyIds = new Set(postings.map((posting) => posting.company_id));
  const financialCompanyIds = new Set(financials.map((financial) => financial.company_id));
  const fieldCounts = companies.reduce((acc, company) => {
    const field = normalizeField(company.defense_field);
    acc[field] = (acc[field] ?? 0) + 1;
    return acc;
  }, {});
  const missingCareers = companies
    .filter((company) => !(company.careers_page_url || profileByCompany.get(company.id)?.careers_page_url))
    .sort((a, b) => Number(b.total_contract_amount ?? 0) - Number(a.total_contract_amount ?? 0))
    .map((company) => ({
      id: company.id,
      company_name: company.company_name,
      defense_field: normalizeField(company.defense_field),
      total_contract_amount: Number(company.total_contract_amount ?? 0),
    }));
  const missingFinancials = companies
    .filter((company) => !financialCompanyIds.has(company.id) && !company.avg_salary && !profileByCompany.get(company.id)?.avg_salary)
    .sort((a, b) => Number(b.total_contract_amount ?? 0) - Number(a.total_contract_amount ?? 0))
    .map((company) => ({
      id: company.id,
      company_name: company.company_name,
      defense_field: normalizeField(company.defense_field),
      total_contract_amount: Number(company.total_contract_amount ?? 0),
    }));

  return {
    mode: "remote_supabase",
    totals: {
      companies: companies.length,
      companies_with_careers_url: companies.filter((company) => company.careers_page_url).length,
      profiles: profiles.length,
      profiles_with_careers_url: profiles.filter((profile) => profile.careers_page_url).length,
      profiles_with_homepage: profiles.filter((profile) => profile.homepage_url).length,
      profiles_with_avg_salary: profiles.filter((profile) => profile.avg_salary).length,
      companies_with_avg_salary: companies.filter((company) => company.avg_salary).length,
      company_financials: financials.length,
      companies_with_financials: financialCompanyIds.size,
      contract_records: contracts.length,
      companies_with_contract_records: contractCompanyIds.size,
      job_postings: postings.length,
      companies_with_job_postings: postingCompanyIds.size,
      company_sources: sources.length,
      companies_with_sources: sourceCompanyIds.size,
      education_rows: education.length,
      common_education_rows: education.filter((row) => row.defense_field === "공통").length,
      job_requirement_rows: jobs.length,
      career_mapping_rows: mappings.length,
      legacy_air_field_rows: companies.filter((company) => company.defense_field === "항공").length,
    },
    field_counts: fieldCounts,
    missing: {
      careers_url_missing_by_contract: missingCareers,
      financials_missing_by_contract: missingFinancials,
      careers_url_top20_by_contract: missingCareers.slice(0, 20),
      financials_top20_by_contract: missingFinancials.slice(0, 20),
    },
    priority_gaps: [
      financials.length === 0 ? "company_financials가 비어 있습니다. OpenDART 기반 보강이 필요합니다." : "",
      contracts.filter((contract) => contract.raw?.contract_number).length < 600
        ? "개별 계약 원천 CSV 매칭 데이터가 600건 미만입니다. 계약 보강 SQL 재적용이 필요할 수 있습니다."
        : "",
      missingCareers.length ? `채용 URL 미확보 기업 ${missingCareers.length}개가 남아 있습니다.` : "",
    ].filter(Boolean),
  };
}

const summary = useRemote ? await summarizeRemote() : summarizeLocal();
fs.writeFileSync(outFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
