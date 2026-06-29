import fs from "node:fs";
import path from "node:path";
import iconv from "iconv-lite";
import Papa from "papaparse";

const root = process.cwd();
const dataDir = path.join(root, "데이터파일");
const outFile = path.join(root, "supabase", "enrichment_opendart_financials.sql");
const companyFile = "방위사업청_방산업체 지정현황_20250531.csv";

function loadLocalEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const apiKey = process.env.OPENDART_API_KEY || process.env.DART_API_KEY;
const targetYear = process.env.OPENDART_YEAR || "2024";
const reportCode = process.env.OPENDART_REPORT_CODE || "11011";

if (!apiKey) {
  throw new Error("OPENDART_API_KEY or DART_API_KEY is required.");
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

function parseNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sql(value) {
  if (value === undefined || value === null || value === "") return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonSql(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function amountToManwon(value) {
  const amount = parseNumber(value);
  if (!amount) return null;
  if (amount >= 10_000_000) return Math.round(amount / 10_000);
  if (amount >= 10_000) return Math.round(amount / 10);
  return Math.round(amount * 100);
}

function parseCorpCodes(xml) {
  return Array.from(xml.matchAll(/<list>([\s\S]*?)<\/list>/g)).map((match) => {
    const item = match[1];
    const pick = (tag) => item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() ?? "";
    return {
      corp_code: pick("corp_code"),
      corp_name: pick("corp_name"),
      stock_code: pick("stock_code"),
      modify_date: pick("modify_date"),
    };
  });
}

async function getJsonOptional(endpoint, params) {
  const url = new URL(`https://opendart.fss.or.kr/api/${endpoint}`);
  url.searchParams.set("crtfc_key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${endpoint} HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.status && payload.status !== "000") {
    return { status: payload.status, message: payload.message, list: [] };
  }
  return payload;
}

function unzipXmlFromCentralDirectory(buffer) {
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ZIP end-of-central-directory not found.");

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory entry.");
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    if (name.toLowerCase().endsWith(".xml")) {
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error("Invalid ZIP local header.");
      }
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return compressed.toString("utf8");
      if (method === 8) return zlib.inflateRawSync(compressed).toString("utf8");
      throw new Error(`Unsupported ZIP compression method: ${method}`);
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error("No XML file found in OpenDART corpCode.zip.");
}

async function loadCorpCodes() {
  const url = new URL("https://opendart.fss.or.kr/api/corpCode.xml");
  url.searchParams.set("crtfc_key", apiKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`corpCode.xml HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return parseCorpCodes(unzipXmlFromCentralDirectory(buffer));
}

function normalizeDartName(value) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("주식회사", "")
    .replaceAll("유한회사", "")
    .replaceAll("재단법인", "")
    .replaceAll("사단법인", "")
    .replaceAll("(주)", "")
    .replaceAll("㈜", "");

  return normalized
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
}

const dartNameAliases = new Map([
  ["LIG넥스원", "LIG디펜스앤에어로스페이스"],
]);

function findCorp(companyName, corpRows) {
  const lookupName = dartNameAliases.get(companyName) ?? companyName;
  const normalized = normalizeDartName(lookupName);
  const exactMatches = corpRows.filter((row) => normalizeDartName(row.corp_name) === normalized);
  if (exactMatches.length) return exactMatches.find((row) => row.stock_code) ?? exactMatches[0];

  const fuzzyMatches = corpRows.filter((row) => {
    const candidate = normalizeDartName(row.corp_name);
    return candidate.length >= 3 && (candidate.includes(normalized) || normalized.includes(candidate));
  });
  return (
    fuzzyMatches.find((row) => row.stock_code) ??
    fuzzyMatches.sort(
      (a, b) =>
        Math.abs(normalizeDartName(a.corp_name).length - normalized.length) -
        Math.abs(normalizeDartName(b.corp_name).length - normalized.length),
    )[0]
  );
}

function summarizeEmployees(rows) {
  const totals = rows
    .filter((row) => !String(row.fo_bbm ?? "").includes("합계"))
    .map((row) => ({
      employee_count: parseNumber(row.sm),
      avg_salary: amountToManwon(row.jan_salary_am),
    }));

  return {
    employee_count: totals.reduce((sum, row) => sum + (row.employee_count ?? 0), 0) || null,
    avg_salary:
      totals.find((row) => row.avg_salary && row.avg_salary > 0)?.avg_salary ??
      amountToManwon(rows.find((row) => String(row.fo_bbm ?? "").includes("합계"))?.jan_salary_am),
  };
}

function summarizeFinancials(rows) {
  const preferred = rows.filter((row) => row.fs_nm?.includes("연결"))?.length
    ? rows.filter((row) => row.fs_nm?.includes("연결"))
    : rows;
  const pick = (...names) =>
    parseNumber(
      preferred.find((row) => names.some((name) => String(row.account_nm ?? "").includes(name)))?.thstrm_amount,
    );

  return {
    revenue: pick("매출액", "수익"),
    operating_profit: pick("영업이익"),
    net_income: pick("당기순이익"),
  };
}

function buildCompanySql(company, corp, employee, financial, raw) {
  const sourceType = `opendart_annual_report_${targetYear}`;
  const sourceUrl = `https://opendart.fss.or.kr/api/empSttus.json?corp_code=${corp.corp_code}&bsns_year=${targetYear}&reprt_code=${reportCode}`;
  return `with source_upsert as (
  insert into public.company_sources (
    company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
  )
  values (
    ${company.id},
    'A_GOV_OFFICIAL',
    ${sql(sourceType)},
    ${sql(`${corp.corp_name} ${targetYear} OpenDART 사업보고서 직원/재무 현황`)},
    ${sql(sourceUrl)},
    'OpenDART',
    ${jsonSql({ corp_code: corp.corp_code, stock_code: corp.stock_code, target_year: targetYear, report_code: reportCode })},
    'Generated by scripts/generate-opendart-financials-sql.mjs'
  )
  on conflict (company_id, source_type, source_url) do update
    set title = excluded.title,
        evidence = excluded.evidence,
        notes = excluded.notes,
        retrieved_at = now()
  returning id
)
insert into public.company_financials (
  company_id, fiscal_year, revenue, operating_profit, net_income, employee_count, avg_salary, source_id, notes
)
select
  ${company.id}, ${targetYear}, ${sql(financial.revenue)}, ${sql(financial.operating_profit)}, ${sql(financial.net_income)},
  ${sql(employee.employee_count)}, ${sql(employee.avg_salary)}, source_upsert.id,
  'OpenDART generated annual-report snapshot'
from source_upsert
where not exists (
  select 1 from public.company_financials existing
  where existing.company_id = ${company.id}
    and existing.fiscal_year = ${targetYear}
    and existing.notes = 'OpenDART generated annual-report snapshot'
);

insert into public.company_profiles (
  company_id, verified_name, stock_code, dart_corp_code, employee_count, employee_count_year, avg_salary, avg_salary_year, data_quality_score, updated_at
)
values (
  ${company.id}, ${sql(corp.corp_name)}, ${sql(corp.stock_code)}, ${sql(corp.corp_code)},
  ${sql(employee.employee_count)}, ${targetYear}, ${sql(employee.avg_salary)}, ${targetYear}, 80, now()
)
on conflict (company_id) do update
  set verified_name = coalesce(public.company_profiles.verified_name, excluded.verified_name),
      stock_code = excluded.stock_code,
      dart_corp_code = excluded.dart_corp_code,
      employee_count = excluded.employee_count,
      employee_count_year = excluded.employee_count_year,
      avg_salary = excluded.avg_salary,
      avg_salary_year = excluded.avg_salary_year,
      data_quality_score = greatest(public.company_profiles.data_quality_score, excluded.data_quality_score),
      updated_at = now();

update public.companies
set avg_salary = ${sql(employee.avg_salary)},
    salary_source = ${sql(`OpenDART ${targetYear} 사업보고서 직원 현황`)}
where id = ${company.id}
  and ${sql(employee.avg_salary)} is not null;
-- raw: ${JSON.stringify(raw).slice(0, 1000).replaceAll("\n", " ")}
`;
}

const companies = parseCsv(companyFile).map((row, index) => ({
  id: index + 1,
  company_name: row["업체명"],
}));
const corpRows = await loadCorpCodes();
const statements = [];
const skipped = [];

for (const company of companies) {
  const corp = findCorp(company.company_name, corpRows);
  if (!corp?.corp_code) {
    skipped.push({ company: company.company_name, reason: "No OpenDART corporation match" });
    continue;
  }

  try {
    const [employeePayload, financialPayload] = await Promise.all([
      getJsonOptional("empSttus.json", { corp_code: corp.corp_code, bsns_year: targetYear, reprt_code: reportCode }),
      getJsonOptional("fnlttSinglAcnt.json", { corp_code: corp.corp_code, bsns_year: targetYear, reprt_code: reportCode }),
    ]);
    if (!(employeePayload.list?.length || financialPayload.list?.length)) {
      skipped.push({
        company: company.company_name,
        corp_code: corp.corp_code,
        corp_name: corp.corp_name,
        stock_code: corp.stock_code,
        reason: `No OpenDART annual data for ${targetYear}`,
        employee_status: employeePayload.status,
        financial_status: financialPayload.status,
      });
      continue;
    }
    const employee = summarizeEmployees(employeePayload.list ?? []);
    const financial = summarizeFinancials(financialPayload.list ?? []);
    statements.push(buildCompanySql(company, corp, employee, financial, { employee, financial }));
  } catch (error) {
    skipped.push({ company: company.company_name, corp_code: corp.corp_code, reason: error.message });
  }
}

const header = `-- Generated from OpenDART empSttus.json and fnlttSinglAcnt.json.
-- Source docs:
-- - https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS002&apiId=2019011
-- - https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019016
-- Target year: ${targetYear}, report code: ${reportCode}

`;
fs.writeFileSync(outFile, `${header}${statements.join("\n")}`, "utf8");

console.log(JSON.stringify({
  outFile,
  generatedStatements: statements.length,
  skipped,
}, null, 2));
