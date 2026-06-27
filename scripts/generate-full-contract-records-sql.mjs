import fs from "node:fs";
import path from "node:path";
import iconv from "iconv-lite";
import Papa from "papaparse";

const root = process.cwd();
const dataDir = path.join(root, "데이터파일");
const outFile = path.join(root, "supabase", "enrichment_contract_records_full.sql");
const companyFile = "방위사업청_방산업체 지정현황_20250531.csv";
const contractFile = "방위사업청_국내조달 계약정보_20251231.csv";
const sourceUrl = "https://www.data.go.kr/data/15050920/fileData.do";
const sourceFileName = "방위사업청_국내조달 계약정보_20251231.csv";

function decodeCsv(fileName, encoding = "auto") {
  const buffer = fs.readFileSync(path.join(dataDir, fileName));
  if (encoding === "cp949") return iconv.decode(buffer, "cp949").replace(/^\uFEFF/, "");
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("�")) return utf8.replace(/^\uFEFF/, "");
  return iconv.decode(buffer, "cp949").replace(/^\uFEFF/, "");
}

function parseCsv(fileName, encoding) {
  const result = Papa.parse(decodeCsv(fileName, encoding), {
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
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\(주\)|주식회사|㈜|유한회사|재단법인|사단법인|합자회사|합명회사/g, "")
    .replace(/[^0-9a-z가-힣]/g, "")
    .trim();
}

function parseNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
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

function jsonSql(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) chunks.push(array.slice(index, index + size));
  return chunks;
}

const companies = parseCsv(companyFile).map((row, index) => {
  const companyName = row["업체명"];
  return {
    id: index + 1,
    company_name: companyName,
    normalized: normalizeName(companyName),
  };
});

const exactCompany = new Map(companies.map((company) => [company.normalized, company]));
const aliases = new Map([
  ["풍산FNS", ["풍산에프앤에스"]],
  ["코오롱스테이스웍스", ["코오롱스페이스웍스"]],
  ["HD현대중공업", ["에이치디현대중공업", "현대중공업"]],
  ["HD현대인프라코어", ["에이치디현대인프라코어", "현대인프라코어", "두산인프라코어"]],
  ["HJ중공업", ["에이치제이중공업", "한진중공업"]],
  ["SNT모티브", ["에스앤티모티브"]],
  ["SNT다이내믹스", ["에스앤티다이내믹스"]],
  ["SK오션플랜트", ["에스케이오션플랜트", "삼강엠앤티"]],
]);
for (const company of companies) {
  for (const alias of aliases.get(company.company_name) ?? []) {
    exactCompany.set(normalizeName(alias), company);
  }
}
const matchCompany = (vendorName) => {
  const normalized = normalizeName(vendorName);
  if (!normalized) return null;
  const exact = exactCompany.get(normalized);
  if (exact) return exact;
  const candidates = companies.filter((company) => {
    if (company.normalized.length < 3) return false;
    return normalized.includes(company.normalized) || company.normalized.includes(normalized);
  });
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.normalized.length - a.normalized.length)[0];
};

const records = [];
const seen = new Set();
for (const row of parseCsv(contractFile, "cp949")) {
  const company = matchCompany(row["대표업체명"]);
  if (!company) continue;

  const contractNumber = row["계약번호"];
  const contractSequence = row["계약차수"];
  const key = `${company.id}:${contractNumber}:${contractSequence}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const contractDate = parseDate(row["계약체결일자"]);
  records.push({
    company_id: company.id,
    company_name: company.company_name,
    contract_name: row["계약명"] || null,
    contract_date: contractDate,
    contract_year: parseYear(contractDate),
    contract_amount: parseNumber(row["총계약금액"] || row["계약금액"]),
    buyer: row["수요기관명"] || row["계약기관명"] || null,
    product_category: row["업무구분명"] || row["계약유형"] || null,
    weapon_system: row["계약명"] || null,
    raw: {
      contract_number: contractNumber,
      contract_sequence: contractSequence,
      contract_method: row["계약체결방법명"],
      contract_form: row["계약체결형태명"],
      contract_type: row["계약유형"],
      demand_org: row["수요기관명"],
      contract_org: row["계약기관명"],
      vendor_name_raw: row["대표업체명"],
      vendor_registration_number: row["대표업체사업자등록번호"],
      source_file: sourceFileName,
    },
  });
}

records.sort((a, b) => (b.contract_amount ?? 0) - (a.contract_amount ?? 0));

const matchedCompanyIds = Array.from(new Set(records.map((record) => record.company_id))).sort((a, b) => a - b);
const sourceValues = matchedCompanyIds
  .map((companyId) => {
    const company = companies.find((item) => item.id === companyId);
    return `(${companyId}, ${sql("domestic_procurement_contract_full_csv")}, ${sql(`${company?.company_name} 국내조달 계약정보 전체 CSV`)}, ${sql(sourceUrl)}, '공공데이터포털', ${jsonSql({ source_file: sourceFileName })}, 'A_GOV_OFFICIAL', 'Generated by scripts/generate-full-contract-records-sql.mjs')`;
  })
  .join(",\n");

const parts = [
  `-- Generated by scripts/generate-full-contract-records-sql.mjs
-- Source: ${sourceUrl}
-- Matched contract rows: ${records.length}
-- Matched companies: ${matchedCompanyIds.length} / ${companies.length}

begin;

delete from public.contract_records
where raw->>'source_file' = ${sql(sourceFileName)}
   or exists (
     select 1 from public.company_sources s
     where s.id = contract_records.source_id
       and s.source_type in ('domestic_procurement_contract_summary', 'domestic_procurement_contract_full_csv')
   );

delete from public.company_sources
where source_type in ('domestic_procurement_contract_summary', 'domestic_procurement_contract_full_csv');

insert into public.company_sources (
  company_id, source_type, title, source_url, publisher, evidence, source_grade, notes
)
values
${sourceValues}
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;
`,
];

for (const [index, rows] of chunk(records, 800).entries()) {
  const values = rows
    .map((record) => `(${[
      record.company_id,
      sql(record.company_name),
      sql(record.contract_name),
      sql(record.contract_date),
      sql(record.contract_year),
      sql(record.contract_amount),
      sql(record.buyer),
      sql(record.product_category),
      sql(record.weapon_system),
      jsonSql(record.raw),
    ].join(", ")})`)
    .join(",\n");

  parts.push(`
with rows(company_id, company_name, contract_name, contract_date, contract_year, contract_amount, buyer, product_category, weapon_system, raw) as (
  values
${values}
)
insert into public.contract_records (
  company_id, company_name, contract_name, contract_date, contract_year, contract_amount, buyer, product_category, weapon_system, source_id, raw
)
select
  rows.company_id,
  rows.company_name,
  rows.contract_name,
  rows.contract_date::date,
  rows.contract_year,
  rows.contract_amount,
  rows.buyer,
  rows.product_category,
  rows.weapon_system,
  source.id,
  rows.raw
from rows
join public.company_sources source
  on source.company_id = rows.company_id
 and source.source_type = 'domestic_procurement_contract_full_csv';
-- chunk ${index + 1}
`);
}

parts.push(`
commit;
`);

fs.writeFileSync(outFile, parts.join("\n"), "utf8");
console.log(JSON.stringify({
  outFile,
  sourceUrl,
  totalContractRows: records.length,
  matchedCompanies: matchedCompanyIds.length,
  unmatchedCompanies: companies
    .filter((company) => !matchedCompanyIds.includes(company.id))
    .map((company) => ({ id: company.id, company_name: company.company_name })),
}, null, 2));
