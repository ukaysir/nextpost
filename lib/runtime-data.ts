import { createClient } from "@supabase/supabase-js";
import {
  localCompanyProfileEnrichment,
  localJobPostingEnrichment,
} from "@/lib/company-enrichment";
import { getAppData, type AppData } from "@/lib/data";
import {
  CareerCenter,
  CareerMapping,
  Company,
  CompanyFinancial,
  CompanyProfile,
  CompanySource,
  ContractRecord,
  EducationCert,
  IndustryStat,
  JobPosting,
  JobRequirement,
} from "@/lib/types";

let runtimeCache: AppData | null = null;

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

function getClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase configuration is missing.");
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchTable<T>(table: string, orderColumn = "id") {
  const client = getClient();
  const { data, error } = await client.from(table).select("*").order(orderColumn);
  if (error) throw new Error(`${table} Supabase 조회 실패: ${error.message}`);
  return (data ?? []) as T[];
}

function mergeProfileEnrichment(profiles: CompanyProfile[]) {
  const byCompanyId = new Map(profiles.map((profile) => [profile.company_id, profile]));

  for (const localProfile of localCompanyProfileEnrichment) {
    const existing = byCompanyId.get(localProfile.company_id);
    if (!existing) {
      byCompanyId.set(localProfile.company_id, localProfile);
      continue;
    }

    byCompanyId.set(localProfile.company_id, {
      ...existing,
      verified_name: existing.verified_name ?? localProfile.verified_name,
      homepage_url: existing.homepage_url ?? localProfile.homepage_url,
      careers_page_url: existing.careers_page_url ?? localProfile.careers_page_url,
      recruit_platform_url: existing.recruit_platform_url ?? localProfile.recruit_platform_url,
      address: existing.address ?? localProfile.address,
      stock_code: existing.stock_code ?? localProfile.stock_code,
      dart_corp_code: existing.dart_corp_code ?? localProfile.dart_corp_code,
      employee_count: existing.employee_count ?? localProfile.employee_count,
      employee_count_year: existing.employee_count_year ?? localProfile.employee_count_year,
      avg_salary: existing.avg_salary ?? localProfile.avg_salary,
      avg_salary_year: existing.avg_salary_year ?? localProfile.avg_salary_year,
      main_products: existing.main_products?.length
        ? existing.main_products
        : localProfile.main_products,
      summary: existing.summary ?? localProfile.summary,
      data_quality_score: Math.max(
        existing.data_quality_score ?? 0,
        localProfile.data_quality_score ?? 0,
      ),
    });
  }

  return [...byCompanyId.values()];
}

function mergeCompanyProfileFields(companies: Company[], profiles: CompanyProfile[]) {
  const profileByCompanyId = new Map(profiles.map((profile) => [profile.company_id, profile]));
  return companies.map((company) => {
    const profile = profileByCompanyId.get(company.id);
    return {
      ...company,
      careers_page_url: company.careers_page_url ?? profile?.careers_page_url ?? null,
      avg_salary: company.avg_salary ?? profile?.avg_salary ?? null,
      salary_source:
        company.salary_source ??
        (profile?.avg_salary ? `${profile.avg_salary_year ?? ""} 공시/프로필 보강`.trim() : null),
    };
  });
}

export async function getRuntimeAppData(): Promise<AppData> {
  if (runtimeCache) return runtimeCache;
  if (!hasSupabaseConfig()) {
    runtimeCache = getAppData();
    return runtimeCache;
  }

  try {
    const [
      companies,
      jobRequirements,
      educationCerts,
      careerMappings,
      careerCenters,
      industryStats,
      companyProfiles,
      companyFinancials,
      companySources,
      contractRecords,
      jobPostings,
      glossaryRows,
    ] = await Promise.all([
      fetchTable<Company>("companies"),
      fetchTable<JobRequirement>("job_requirements"),
      fetchTable<EducationCert>("education_certs"),
      fetchTable<CareerMapping & { id: number }>("career_mapping"),
      fetchTable<CareerCenter>("career_centers"),
      fetchTable<IndustryStat>("industry_stats", "year"),
      fetchTable<CompanyProfile>("company_profiles", "company_id"),
      fetchTable<CompanyFinancial>("company_financials", "fiscal_year"),
      fetchTable<CompanySource>("company_sources"),
      fetchTable<ContractRecord>("contract_records"),
      fetchTable<JobPosting>("job_postings"),
      fetchTable<{ id: number; term: string; description: string }>("glossary_terms"),
    ]);

    const enrichedCompanyProfiles = mergeProfileEnrichment(companyProfiles);
    const enrichedCompanies = mergeCompanyProfileFields(companies, enrichedCompanyProfiles);
    const enrichedJobPostings = [...jobPostings, ...localJobPostingEnrichment];

    runtimeCache = {
      companies: enrichedCompanies,
      jobRequirements,
      educationCerts,
      careerMappings: careerMappings.map((mapping) => ({
        specialty_keyword: mapping.specialty_keyword,
        position_keywords: mapping.position_keywords,
        defense_field: mapping.defense_field,
        job_group: mapping.job_group,
      })),
      careerCenters,
      industryStats,
      companyProfiles: enrichedCompanyProfiles,
      companyFinancials,
      companySources,
      contractRecords,
      jobPostings: enrichedJobPostings,
      glossaryTerms: glossaryRows
        .map((row) => `- ${row.term}: ${row.description}`)
        .join("\n"),
    };
    return runtimeCache;
  } catch (error) {
    console.error("Supabase data load failed. Falling back to local CSV data.", error);
    try {
      runtimeCache = getAppData();
      return runtimeCache;
    } catch {
      throw error;
    }
  }
}

export async function getLatestRuntimeIndustryStat() {
  const stats = (await getRuntimeAppData()).industryStats;
  return [...stats].sort((a, b) => b.year - a.year)[0];
}

function latestIso(values: Array<string | null | undefined>) {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? null : { value, time };
    })
    .filter((item): item is { value: string; time: number } => Boolean(item))
    .sort((a, b) => b.time - a.time);

  return sorted[0]?.value ?? null;
}

export async function getRuntimeDataFreshness() {
  const data = await getRuntimeAppData();
  const latestFinancialYear = data.companyFinancials.reduce<number | null>(
    (latest, item) =>
      latest === null || item.fiscal_year > latest ? item.fiscal_year : latest,
    null,
  );

  return {
    latest_source_at: latestIso([
      ...data.companySources.map((source) => source.retrieved_at ?? source.created_at),
      ...data.contractRecords.map((record) => record.created_at),
      ...data.companyFinancials.map((financial) => financial.created_at),
    ]),
    latest_profile_at: latestIso(data.companyProfiles.map((profile) => profile.updated_at)),
    latest_job_posting_at: latestIso(data.jobPostings.map((posting) => posting.collected_at)),
    latest_contract_date: latestIso(data.contractRecords.map((record) => record.contract_date)),
    latest_financial_year: latestFinancialYear,
    generated_at: new Date().toISOString(),
  };
}
