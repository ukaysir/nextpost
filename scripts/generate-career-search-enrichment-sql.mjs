import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const outFile = path.join(root, "supabase", "enrichment_career_search.sql");

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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error("SUPABASE_URL and SUPABASE key are required.");

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const allowedRecruitHosts = [
  "saramin.co.kr",
  "jobkorea.co.kr",
  "incruit.com",
  "wanted.co.kr",
  "jumpit.co.kr",
  "jasoseol.com",
  "catch.co.kr",
  "recruiter.co.kr",
  "greetinghr.com",
  "applyin.co.kr",
  "jobplanet.co.kr",
  "rememberapp.co.kr",
  "career.co.kr",
  "work.go.kr",
  "recruit.hd.com",
  "hanwhain.com",
  "career.kia.com",
];

function sql(value) {
  if (value === undefined || value === null || value === "") return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonSql(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hostBase(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isAllowedUrl(url, homepageUrl) {
  const candidateHost = hostBase(url);
  if (!candidateHost) return false;
  const homepageHost = hostBase(homepageUrl);
  const isCompanyDomain =
    homepageHost &&
    (candidateHost === homepageHost ||
      candidateHost.endsWith(`.${homepageHost}`) ||
      homepageHost.endsWith(`.${candidateHost}`));
  const isRecruitHost = allowedRecruitHosts.some(
    (host) => candidateHost === host || candidateHost.endsWith(`.${host}`),
  );
  return isCompanyDomain || isRecruitHost;
}

function scoreCandidate({ url, title, snippet, companyName, homepageUrl }) {
  const text = `${url} ${title} ${snippet}`.toLowerCase();
  const company = companyName.toLowerCase();
  let score = 0;
  if (text.includes("채용")) score += 30;
  if (text.includes("recruit") || text.includes("career") || text.includes("jobs")) score += 24;
  if (text.includes(company)) score += 18;
  if (hostBase(homepageUrl) && hostBase(url) === hostBase(homepageUrl)) score += 18;
  if (allowedRecruitHosts.some((host) => hostBase(url).endsWith(host))) score += 10;
  if (/\/(recruit|career|careers|jobs?)(\/|$|\?|#)/i.test(url)) score += 14;
  if (/채용|인재|입사지원/.test(title)) score += 10;
  if (/blog|news|article|youtube|facebook|instagram|namu|wiki|dart\.fss|opendart/i.test(url)) score -= 40;
  return score;
}

function isGenericJobSearch(url) {
  return /\/jobs\/list\/industry|\/zf_user\/jobs\/list|\/recruit\/joblist|\/Recruit\/GI_Read/i.test(url);
}

function isRecruitPlatformUrl(url) {
  const candidateHost = hostBase(url);
  return allowedRecruitHosts.some((host) => candidateHost === host || candidateHost.endsWith(`.${host}`));
}

function hasCompanyEvidence(result, companyName) {
  const compactText = `${result.url} ${result.title} ${result.snippet}`
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
  const compactCompany = companyName
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
  return compactCompany.length >= 2 && compactText.includes(compactCompany);
}

function decodeDuckDuckGoUrl(href) {
  try {
    const url = new URL(href, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    return normalizeUrl(uddg ? decodeURIComponent(uddg) : url.toString());
  } catch {
    return null;
  }
}

function parseDuckDuckGo(html) {
  const results = [];
  const blockRegex = /<div class="result[\s\S]*?<\/div>\s*<\/div>/gi;
  for (const blockMatch of html.matchAll(blockRegex)) {
    const block = blockMatch[0];
    const linkMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const url = decodeDuckDuckGoUrl(linkMatch[1]);
    if (!url) continue;
    const snippetMatch = block.match(/<a[^>]+class="result__snippet"[\s\S]*?>([\s\S]*?)<\/a>/i);
    results.push({
      url,
      title: cleanText(linkMatch[2]),
      snippet: cleanText(snippetMatch?.[1] ?? ""),
    });
  }
  return results;
}

async function fetchText(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 NEXTPOST career search enrichment",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchCompany(company) {
  const queries = [
    `${company.company_name} 채용`,
    `${company.company_name} 채용공고`,
    `${company.company_name} recruit`,
    company.homepage_url ? `${company.company_name} site:${hostBase(company.homepage_url)} 채용` : null,
  ].filter(Boolean);

  const candidates = [];
  for (const query of queries) {
    const url = new URL("https://duckduckgo.com/html/");
    url.searchParams.set("q", query);
    const html = await fetchText(url.toString());
    if (!html) continue;
    for (const result of parseDuckDuckGo(html)) {
      if (!isAllowedUrl(result.url, company.homepage_url)) continue;
      if (isGenericJobSearch(result.url)) continue;
      if (isRecruitPlatformUrl(result.url) && !hasCompanyEvidence(result, company.company_name)) continue;
      const score = scoreCandidate({ ...result, companyName: company.company_name, homepageUrl: company.homepage_url });
      if (score < 35) continue;
      candidates.push({ ...result, score, query });
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

async function fetchAll(table, select) {
  const { data, error } = await client.from(table).select(select);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

const [companies, profiles] = await Promise.all([
  fetchAll("companies", "id, company_name, defense_field, total_contract_amount, careers_page_url"),
  fetchAll("company_profiles", "company_id, homepage_url, careers_page_url"),
]);

const profileByCompany = new Map(profiles.map((profile) => [profile.company_id, profile]));
const targets = companies
  .filter((company) => !(company.careers_page_url || profileByCompany.get(company.id)?.careers_page_url))
  .map((company) => ({
    ...company,
    homepage_url: profileByCompany.get(company.id)?.homepage_url ?? null,
  }))
  .sort((a, b) => Number(b.total_contract_amount ?? 0) - Number(a.total_contract_amount ?? 0));

const results = [];
for (const target of targets) {
  const result = await searchCompany(target);
  if (result) {
    results.push({ ...target, result });
    console.log(`${target.company_name}: ${result.url}`);
  } else {
    console.log(`${target.company_name}: no verified result`);
  }
}

const parts = [
  `-- Generated by scripts/generate-career-search-enrichment-sql.mjs
-- Targets searched: ${targets.length}
-- Verified links: ${results.length}

begin;

delete from public.job_postings
where source_id in (
  select id from public.company_sources
  where source_type = 'search_verified_career_link'
);

update public.company_profiles profile
set careers_page_url = null,
    updated_at = now()
where exists (
  select 1 from public.company_sources source
  where source.company_id = profile.company_id
    and source.source_type = 'search_verified_career_link'
    and source.source_url = profile.careers_page_url
);

update public.companies company
set careers_page_url = null
where exists (
  select 1 from public.company_sources source
  where source.company_id = company.id
    and source.source_type = 'search_verified_career_link'
    and source.source_url = company.careers_page_url
);

delete from public.company_sources
where source_type = 'search_verified_career_link';
`,
];

if (results.length) {
  const values = results
    .map(({ id, company_name, result }) => {
      const grade = allowedRecruitHosts.some((host) => hostBase(result.url).endsWith(host))
        ? "D_SECONDARY_OR_COMMERCIAL"
        : "B_COMPANY_OFFICIAL";
      return `(${[
        id,
        sql(grade),
        sql(`${company_name} 검색 검증 채용 링크`),
        sql(result.url),
        sql(hostBase(result.url)),
        jsonSql({
          verification: "duckduckgo_search",
          query: result.query,
          title: result.title,
          snippet: result.snippet,
          score: result.score,
        }),
        sql(`${company_name} ${result.title}`),
      ].join(", ")})`;
    })
    .join(",\n");

  parts.push(`
with rows(company_id, source_grade, title, source_url, publisher, evidence, job_function) as (
  values
${values}
)
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
select
  company_id,
  source_grade,
  'search_verified_career_link',
  title,
  source_url,
  publisher,
  evidence,
  'Verified by DuckDuckGo web search and host allow-list'
from rows
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;

with rows(company_id, source_url) as (
  values
${results.map(({ id, result }) => `(${id}, ${sql(result.url)})`).join(",\n")}
)
update public.companies company
set careers_page_url = rows.source_url
from rows
where company.id = rows.company_id;

with rows(company_id, source_url) as (
  values
${results.map(({ id, result }) => `(${id}, ${sql(result.url)})`).join(",\n")}
)
update public.company_profiles profile
set careers_page_url = rows.source_url,
    updated_at = now()
from rows
where profile.company_id = rows.company_id;

with rows(company_id, source_url, job_function, raw) as (
  values
${results
  .map(
    ({ id, company_name, defense_field, result }) =>
      `(${id}, ${sql(result.url)}, ${sql(`${defense_field ?? "방산"} 분야 채용 정보 확인`)}, ${jsonSql({
        kind: "search_verified_career_page_pointer",
        company_name,
        query: result.query,
        title: result.title,
        score: result.score,
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
  '검색 검증 채용 정보 페이지',
  rows.job_function,
  null,
  null,
  '군 경력 및 방산 직무 연관 경험 우대 가능',
  '{}'::text[],
  '{}'::text[],
  null,
  rows.source_url,
  null,
  rows.raw
from rows
join public.company_sources sources
  on sources.company_id = rows.company_id
 and sources.source_type = 'search_verified_career_link'
 and sources.source_url = rows.source_url
where not exists (
  select 1 from public.job_postings existing
  where existing.company_id = rows.company_id
    and existing.posting_url = rows.source_url
    and existing.title = '검색 검증 채용 정보 페이지'
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
      targets: targets.length,
      verifiedLinks: results.length,
      companies: results.map(({ company_name, result }) => ({ company_name, url: result.url, score: result.score })),
    },
    null,
    2,
  ),
);
