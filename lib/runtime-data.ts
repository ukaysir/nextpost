import { createClient } from "@supabase/supabase-js";
import { getAppData, type AppData } from "@/lib/data";
import {
  CareerCenter,
  CareerMapping,
  Company,
  EducationCert,
  IndustryStat,
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
      glossaryRows,
    ] = await Promise.all([
      fetchTable<Company>("companies"),
      fetchTable<JobRequirement>("job_requirements"),
      fetchTable<EducationCert>("education_certs"),
      fetchTable<CareerMapping & { id: number }>("career_mapping"),
      fetchTable<CareerCenter>("career_centers"),
      fetchTable<IndustryStat>("industry_stats", "year"),
      fetchTable<{ id: number; term: string; description: string }>("glossary_terms"),
    ]);

    runtimeCache = {
      companies,
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
