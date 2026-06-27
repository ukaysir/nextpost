import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import iconv from "iconv-lite";
import Papa from "papaparse";

const root = process.cwd();
const outFile = path.join(root, "supabase", "enrichment_company_web.sql");
const targetDate = new Date().toISOString();

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
if (!apiKey) throw new Error("OPENDART_API_KEY or DART_API_KEY is required.");

function findDataDir() {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .find((dir) => fs.readdirSync(dir).some((name) => name.endsWith(".csv")));
}

const dataDir = findDataDir();
if (!dataDir) throw new Error("CSV data directory was not found.");

function findCsv(pattern) {
  const file = fs.readdirSync(dataDir).find((name) => pattern.test(name));
  if (!file) throw new Error(`CSV not found: ${pattern}`);
  return file;
}

function decodeCsv(fileName) {
  const buffer = fs.readFileSync(path.join(dataDir, fileName));
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("\uFFFD") && !utf8.includes("占")) return utf8.replace(/^\uFEFF/, "");
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

function pickKey(row, candidates) {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const exact = keys.find((key) => key === candidate);
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const partial = keys.find((key) => key.includes(candidate));
    if (partial) return partial;
  }
  return null;
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/주식회사|유한회사|합자회사|재단법인|사단법인|\(주\)|㈜/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
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

function stripTags(value) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#40;/g, "(")
    .replace(/&#41;/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return null;
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname.includes(".") || url.hostname === "-") return null;
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
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
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP central directory entry.");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    if (name.toLowerCase().endsWith(".xml")) {
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) throw new Error("Invalid ZIP local header.");
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

async function loadCorpCodes() {
  const url = new URL("https://opendart.fss.or.kr/api/corpCode.xml");
  url.searchParams.set("crtfc_key", apiKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`corpCode.xml HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return parseCorpCodes(unzipXmlFromCentralDirectory(buffer));
}

async function getCompanyProfile(corpCode) {
  const url = new URL("https://opendart.fss.or.kr/api/company.json");
  url.searchParams.set("crtfc_key", apiKey);
  url.searchParams.set("corp_code", corpCode);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`company.json HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.status && payload.status !== "000") return null;
  return payload;
}

const dartNameAliases = new Map([
  ["풍산FNS", "풍산에프앤에스"],
  ["코오롱스페이스웍스", "코오롱스페이스웍스"],
  ["HD현대중공업", "에이치디현대중공업"],
  ["HD현대인프라코어", "에이치디현대인프라코어"],
  ["HJ중공업", "에이치제이중공업"],
  ["SNT모티브", "에스앤티모티브"],
  ["SNT다이내믹스", "에스앤티다이내믹스"],
  ["SK오션플랜트", "에스케이오션플랜트"],
  ["한화시스템", "한화시스템"],
  ["한화에어로스페이스", "한화에어로스페이스"],
  ["LIG넥스원", "엘아이지넥스원"],
]);

function findCorp(companyName, corpRows) {
  const lookupName = dartNameAliases.get(companyName) ?? companyName;
  const normalized = normalizeName(lookupName);
  const exactMatches = corpRows.filter((row) => normalizeName(row.corp_name) === normalized);
  if (exactMatches.length) return exactMatches.find((row) => row.stock_code) ?? exactMatches[0];

  const fuzzyMatches = corpRows.filter((row) => {
    const candidate = normalizeName(row.corp_name);
    return candidate.length >= 3 && (candidate.includes(normalized) || normalized.includes(candidate));
  });

  return (
    fuzzyMatches.find((row) => row.stock_code) ??
    fuzzyMatches.sort(
      (a, b) =>
        Math.abs(normalizeName(a.corp_name).length - normalized.length) -
        Math.abs(normalizeName(b.corp_name).length - normalized.length),
    )[0]
  );
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchText(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 NEXTPOST data enrichment",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/text|html|xml/i.test(contentType)) return null;
    return {
      url: response.url,
      text: (await response.text()).slice(0, 1_000_000),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractCareerLink(homepageUrl, html, finalUrl) {
  const keywords = ["채용", "인재", "입사", "recruit", "career", "careers", "jobs", "job", "employment", "talent"];
  const homepageHost = new URL(homepageUrl).hostname.replace(/^www\./i, "");
  const allowedExternalHosts = [
    "saramin.co.kr",
    "jobkorea.co.kr",
    "incruit.com",
    "recruiter.co.kr",
    "greetinghr.com",
    "wanted.co.kr",
    "jasoseol.com",
    "applyin.co.kr",
    "recruit.hd.com",
    "career.kia.com",
  ];
  const links = [];
  const regex = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(regex)) {
    const href = String(match[1] ?? "").trim();
    const text = stripTags(match[2]);
    const searchable = `${href} ${text}`.toLowerCase();
    if (!keywords.some((keyword) => searchable.includes(keyword.toLowerCase()))) continue;
    if (/^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    try {
      const resolved = new URL(href, finalUrl || homepageUrl);
      if (!["http:", "https:"].includes(resolved.protocol)) continue;
      const resolvedHost = resolved.hostname.replace(/^www\./i, "");
      const isSameSite =
        resolvedHost === homepageHost ||
        resolvedHost.endsWith(`.${homepageHost}`) ||
        homepageHost.endsWith(`.${resolvedHost}`);
      const isAllowedRecruitPlatform = allowedExternalHosts.some(
        (host) => resolvedHost === host || resolvedHost.endsWith(`.${host}`),
      );
      if (!isSameSite && !isAllowedRecruitPlatform) continue;
      resolved.hash = "";
      links.push({
        url: resolved.toString().replace(/\/$/, ""),
        label: text || href,
        score:
          (text.includes("채용") || text.toLowerCase().includes("recruit") ? 20 : 0) +
          (isSameSite ? 10 : 0) +
          (searchable.includes("career") || searchable.includes("job") ? 5 : 0),
      });
    } catch {
      // Ignore malformed links from company homepages.
    }
  }

  return links.sort((a, b) => b.score - a.score)[0] ?? null;
}

async function findCareerPage(homepageUrl) {
  const page = await fetchText(homepageUrl);
  if (!page) return null;

  const linked = extractCareerLink(homepageUrl, page.text, page.url);
  if (linked) return { ...linked, detected_from: page.url };

  const base = new URL(page.url || homepageUrl);
  const candidatePaths = ["/recruit", "/recruit/", "/careers", "/career", "/jobs", "/kr/recruit", "/kor/recruit"];
  for (const candidatePath of candidatePaths) {
    const candidate = new URL(candidatePath, base).toString().replace(/\/$/, "");
    const candidatePage = await fetchText(candidate, 4500);
    if (candidatePage) return { url: candidate, label: candidatePath, detected_from: page.url };
  }

  return null;
}

const companyFile = findCsv(/방산업체 지정현황.*20250531/);
const companyRows = parseCsv(companyFile);
const nameKey = pickKey(companyRows[0], ["업체명"]);
const fieldKey = pickKey(companyRows[0], ["분야"]);
if (!nameKey) throw new Error("Company name column was not found.");

const companies = companyRows.map((row, index) => ({
  id: index + 1,
  company_name: row[nameKey],
  defense_field: fieldKey ? row[fieldKey] : null,
}));

const corpRows = await loadCorpCodes();
const matched = companies
  .map((company) => ({
    ...company,
    corp: findCorp(company.company_name, corpRows),
  }))
  .filter((company) => company.corp?.corp_code);

const profileResults = (
  await mapLimit(matched, 4, async (company) => {
    const profile = await getCompanyProfile(company.corp.corp_code);
    if (!profile) return null;
    return {
      ...company,
      profile,
      homepage_url: normalizeUrl(profile.hm_url),
    };
  })
).filter(Boolean);

const careerResults = (
  await mapLimit(
    profileResults.filter((company) => company.homepage_url),
    8,
    async (company) => {
      const career = await findCareerPage(company.homepage_url);
      if (!career) return null;
      return { ...company, career };
    },
  )
).filter(Boolean);

const careerByCompanyId = new Map(careerResults.map((item) => [item.id, item]));

const parts = [
  `-- Generated by scripts/generate-company-web-enrichment-sql.mjs
-- Generated at: ${targetDate}
-- OpenDART matched companies: ${profileResults.length} / ${companies.length}
-- Official career links detected: ${careerResults.length}

begin;

delete from public.job_postings
where source_id in (
  select id from public.company_sources
  where source_type in ('official_homepage_career_link')
);

update public.company_profiles profile
set careers_page_url = null,
    updated_at = now()
where exists (
  select 1 from public.company_sources source
  where source.company_id = profile.company_id
    and source.source_type = 'official_homepage_career_link'
    and source.source_url = profile.careers_page_url
);

update public.companies company
set careers_page_url = null
where exists (
  select 1 from public.company_sources source
  where source.company_id = company.id
    and source.source_type = 'official_homepage_career_link'
    and source.source_url = company.careers_page_url
);

delete from public.company_sources
where source_type in ('opendart_company_profile', 'official_homepage_career_link');
`,
];

if (profileResults.length) {
  const profileValues = profileResults
    .map((company) => {
      const profile = company.profile;
      const careerUrl = careerByCompanyId.get(company.id)?.career.url ?? null;
      return `(${[
        company.id,
        sql(profile.corp_name || company.corp.corp_name || company.company_name),
        sql(company.homepage_url),
        sql(careerUrl),
        sql(profile.adres),
        sql(profile.stock_code || company.corp.stock_code),
        sql(company.corp.corp_code),
        sql(profile.ceo_nm),
        sql(profile.phn_no),
        sql(profile.ir_url),
        sql(profile.induty_code),
        sql(profile.est_dt),
        careerUrl ? 82 : company.homepage_url ? 74 : 62,
      ].join(", ")})`;
    })
    .join(",\n");

  parts.push(`
with rows(
  company_id, verified_name, homepage_url, careers_page_url, address, stock_code, dart_corp_code,
  ceo_name, phone, ir_url, industry_code, founded_date, data_quality_score
) as (
  values
${profileValues}
)
insert into public.company_profiles (
  company_id, verified_name, homepage_url, careers_page_url, address, stock_code, dart_corp_code,
  summary, data_quality_score, updated_at
)
select
  company_id,
  verified_name,
  homepage_url,
  careers_page_url,
  address,
  stock_code,
  dart_corp_code,
  concat_ws(' · ', nullif(ceo_name, ''), nullif(phone, ''), nullif(industry_code, ''), nullif(founded_date, '')),
  data_quality_score,
  now()
from rows
on conflict (company_id) do update
  set verified_name = coalesce(excluded.verified_name, public.company_profiles.verified_name),
      homepage_url = coalesce(excluded.homepage_url, public.company_profiles.homepage_url),
      careers_page_url = coalesce(excluded.careers_page_url, public.company_profiles.careers_page_url),
      address = coalesce(excluded.address, public.company_profiles.address),
      stock_code = coalesce(excluded.stock_code, public.company_profiles.stock_code),
      dart_corp_code = coalesce(excluded.dart_corp_code, public.company_profiles.dart_corp_code),
      summary = coalesce(excluded.summary, public.company_profiles.summary),
      data_quality_score = greatest(public.company_profiles.data_quality_score, excluded.data_quality_score),
      updated_at = now();
`);

  const sourceValues = profileResults
    .map((company) => {
      const evidence = {
        endpoint: "company.json",
        corp_code: company.corp.corp_code,
        dart_name: company.profile.corp_name,
        stock_code: company.profile.stock_code || company.corp.stock_code || null,
        homepage_url: company.homepage_url,
      };
      return `(${company.id}, 'A_GOV_OFFICIAL', 'opendart_company_profile', ${sql(`${company.company_name} OpenDART 기업개황`)}, ${sql(`https://opendart.fss.or.kr/api/company.json?corp_code=${company.corp.corp_code}`)}, 'OpenDART', ${jsonSql(evidence)}, 'Generated by scripts/generate-company-web-enrichment-sql.mjs')`;
    })
    .join(",\n");

  parts.push(`
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
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
`);
}

if (careerResults.length) {
  const careerValues = careerResults
    .map((company) => {
      const evidence = {
        homepage_url: company.homepage_url,
        detected_from: company.career.detected_from,
        link_label: company.career.label,
      };
      return `(${company.id}, 'B_COMPANY_OFFICIAL', 'official_homepage_career_link', ${sql(`${company.company_name} 공식 채용 페이지`)}, ${sql(company.career.url)}, ${sql(company.company_name)}, ${jsonSql(evidence)}, 'Detected from official homepage links by scripts/generate-company-web-enrichment-sql.mjs')`;
    })
    .join(",\n");

  parts.push(`
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
values
${careerValues}
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;

with rows(company_id, careers_page_url) as (
  values
${careerResults.map((company) => `(${company.id}, ${sql(company.career.url)})`).join(",\n")}
)
update public.companies
set careers_page_url = rows.careers_page_url
from rows
where public.companies.id = rows.company_id;

with rows(company_id, title, job_function, posting_url, raw) as (
  values
${careerResults
  .map((company) =>
    `(${company.id}, ${sql("공식 채용 페이지")}, ${sql(`${company.defense_field ?? "방산"} 분야 채용 정보 확인`)}, ${sql(company.career.url)}, ${jsonSql({
      kind: "official_career_page_pointer",
      homepage_url: company.homepage_url,
      link_label: company.career.label,
    })})`,
  )
  .join(",\n")}
)
insert into public.job_postings (
  company_id, source_id, title, job_function, employment_type, experience_level,
  preferred_military_experience, required_skills, preferred_skills, location,
  posting_url, is_active, raw
)
select
  rows.company_id,
  sources.id,
  rows.title,
  rows.job_function,
  null,
  null,
  '군 경력 및 방산 직무 연관 경험 우대 가능',
  '{}'::text[],
  '{}'::text[],
  null,
  rows.posting_url,
  null,
  rows.raw
from rows
join public.company_sources sources
  on sources.company_id = rows.company_id
 and sources.source_type = 'official_homepage_career_link'
 and sources.source_url = rows.posting_url
where not exists (
  select 1 from public.job_postings existing
  where existing.company_id = rows.company_id
    and existing.posting_url = rows.posting_url
    and existing.title = rows.title
);
`);
}

parts.push(`
commit;
`);

fs.writeFileSync(outFile, parts.join("\n"), "utf8");
console.log(
  JSON.stringify(
    {
      outFile,
      companies: companies.length,
      opendartMatched: profileResults.length,
      careerLinksDetected: careerResults.length,
      profilesWithoutHomepage: profileResults.filter((company) => !company.homepage_url).length,
      unmatchedCompanies: companies.length - matched.length,
    },
    null,
    2,
  ),
);
