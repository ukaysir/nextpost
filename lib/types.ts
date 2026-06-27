import { z } from "zod";

export const DEFENSE_FIELDS = [
  "항공유도",
  "통신전자",
  "기동",
  "함정",
  "탄약",
  "화력",
  "화생방",
  "기타",
] as const;

export const analyzeInputSchema = z.object({
  military_branch: z.enum(["육군", "해군", "공군", "해병대"]),
  rank: z.string().min(1).max(20),
  specialty: z.string().min(1).max(40),
  position: z.string().min(1).max(120),
  years_served: z.coerce.number().int().min(1).max(30),
  major: z.string().min(1).max(80),
  certifications: z.array(z.string().min(1).max(40)).max(12).default([]),
  desired_field: z.string().min(1).max(20),
  preferred_region: z.string().max(40).optional().default(""),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;

export type Company = {
  id: number;
  company_name: string;
  defense_field: string;
  designation_date?: string | null;
  total_contract_amount: number;
  recent_contract_year?: number | null;
  is_cost_certified: boolean;
  careers_page_url?: string | null;
  avg_salary?: number | null;
  salary_source?: string | null;
};

export type CompanyProfile = {
  company_id: number;
  verified_name?: string | null;
  homepage_url?: string | null;
  careers_page_url?: string | null;
  recruit_platform_url?: string | null;
  address?: string | null;
  stock_code?: string | null;
  dart_corp_code?: string | null;
  employee_count?: number | null;
  employee_count_year?: number | null;
  avg_salary?: number | null;
  avg_salary_year?: number | null;
  main_products: string[];
  summary?: string | null;
  data_quality_score: number;
};

export type CompanyFinancial = {
  id: number;
  company_id: number;
  fiscal_year: number;
  revenue?: number | null;
  operating_profit?: number | null;
  net_income?: number | null;
  employee_count?: number | null;
  avg_salary?: number | null;
  source_id?: number | null;
  notes?: string | null;
};

export type ContractRecord = {
  id: number;
  company_id?: number | null;
  company_name: string;
  contract_name?: string | null;
  contract_date?: string | null;
  contract_year?: number | null;
  contract_amount?: number | null;
  buyer?: string | null;
  product_category?: string | null;
  weapon_system?: string | null;
};

export type JobPosting = {
  id: number;
  company_id: number;
  title: string;
  job_function?: string | null;
  employment_type?: string | null;
  experience_level?: string | null;
  preferred_military_experience?: string | null;
  required_skills: string[];
  preferred_skills: string[];
  location?: string | null;
  posted_at?: string | null;
  deadline_at?: string | null;
  posting_url?: string | null;
  is_active?: boolean | null;
};

export type CompanySource = {
  id: number;
  company_id: number;
  source_grade: "A_GOV_OFFICIAL" | "B_COMPANY_OFFICIAL" | "C_PUBLIC_OR_PARTNER" | "D_SECONDARY_OR_COMMERCIAL" | string;
  source_type: string;
  title?: string | null;
  source_url: string;
  publisher?: string | null;
  notes?: string | null;
};

export type JobRequirement = {
  id: number;
  defense_field: string;
  job_title: string;
  required_skills: string[];
  preferred_military_exp: string;
  related_weapon_system: string;
};

export type EducationCert = {
  id: number;
  defense_field: string;
  job_title: string;
  level: "입문" | "중급" | "심화" | string;
  education_name: string;
  education_provider: string;
  education_link: string;
  cert_name: string;
};

export type CareerMapping = {
  specialty_keyword: string;
  position_keywords: string[];
  defense_field: string;
  job_group: string;
};

export type CareerCenter = {
  id: number;
  name: string;
  address: string;
  phone: string;
  jurisdiction: string;
};

export type IndustryStat = {
  year: number;
  sales?: number;
  operating_profit_rate?: number;
  raw: Record<string, string>;
};

const glossaryMatchSchema = z.object({
  term: z.string(),
  description: z.string(),
});

export const analysisResultSchema = z.object({
  skill_translation: z.object({
    summary: z.string(),
    keywords: z.array(z.string()),
  }),
  recommended_companies: z.array(
    z.object({
      company_name: z.string(),
      fit_score: z.number().int().min(0).max(100),
      reason: z.string(),
      recommended_positions: z.array(z.string()),
      defense_field: z.string().nullable().optional(),
      total_contract_amount: z.number().nullable().optional(),
      recent_contract_year: z.number().nullable().optional(),
      is_cost_certified: z.boolean().nullable().optional(),
      careers_page_url: z.string().nullable().optional(),
      avg_salary: z.number().nullable().optional(),
      salary_source: z.string().nullable().optional(),
    }),
  ),
  skill_gap: z.object({
    possessed: z.array(z.string()),
    missing: z.array(z.string()),
    analysis: z.string(),
  }),
  education_roadmap: z.array(
    z.object({
      step: z.number().int(),
      level: z.string(),
      education_name: z.string(),
      education_link: z.string(),
      reason: z.string(),
    }),
  ),
  recommended_certs: z.array(z.string()),
  discharge_timing: z.object({
    now: z.string(),
    later: z.string(),
    recommendation: z.string(),
  }),
  matched_field: z.string().optional(),
  matched_job_group: z.string().optional(),
  matching_evidence: z.object({
    specialty_keyword: z.string().nullable().optional(),
    position_keywords: z.array(z.string()),
    defense_field: z.string(),
    job_group: z.string().nullable().optional(),
    matched_by: z.array(z.string()),
  }).optional(),
  job_cards: z.array(
    z.object({
      job_title: z.string(),
      required_skills: z.array(z.string()),
      preferred_military_exp: z.string().nullable().optional(),
      related_weapon_system: z.string().nullable().optional(),
    }),
  ).optional(),
  field_market_summary: z.object({
    defense_field: z.string(),
    company_count: z.number().int(),
    companies_with_contracts: z.number().int(),
    cost_certified_count: z.number().int(),
    total_contract_amount: z.number(),
  }).optional(),
  industry_growth: z.object({
    latest_year: z.number().int(),
    latest_sales: z.number().nullable(),
    latest_operating_profit_rate: z.number().nullable(),
    previous_year: z.number().int().nullable(),
    previous_sales: z.number().nullable(),
    sales_growth_rate: z.number().nullable(),
  }).optional(),
  education_groups: z.array(
    z.object({
      level: z.string(),
      items: z.array(
        z.object({
          education_name: z.string(),
          education_provider: z.string().nullable().optional(),
          education_link: z.string().nullable().optional(),
          cert_name: z.string().nullable().optional(),
          job_title: z.string().nullable().optional(),
          defense_field: z.string().nullable().optional(),
        }),
      ),
    }),
  ).optional(),
  glossary_matches: z.array(glossaryMatchSchema).optional(),
  data_reliability: z.array(
    z.object({
      company_name: z.string(),
      score: z.number().int().min(0).max(100),
      signals: z.array(z.string()),
    }),
  ).optional(),
  recommendation_evidence: z.array(
    z.object({
      company_name: z.string(),
      evidence_points: z.array(z.string()),
    }),
  ).optional(),
  data_coverage_summary: z.object({
    recommended_company_count: z.number().int(),
    with_careers_url: z.number().int(),
    with_homepage: z.number().int(),
    with_profile: z.number().int(),
    with_contract_records: z.number().int(),
    with_job_postings: z.number().int(),
    with_salary: z.number().int(),
    with_sources: z.number().int(),
    known_gaps: z.array(z.string()),
  }).optional(),
  company_details: z.array(
    z.object({
      company_name: z.string(),
      verified_name: z.string().nullable().optional(),
      homepage_url: z.string().nullable().optional(),
      careers_page_url: z.string().nullable().optional(),
      designation_date: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      stock_code: z.string().nullable().optional(),
      dart_corp_code: z.string().nullable().optional(),
      summary: z.string().nullable().optional(),
      main_products: z.array(z.string()),
      data_quality_score: z.number().nullable().optional(),
      contracts: z.array(
        z.object({
          contract_name: z.string().nullable().optional(),
          contract_date: z.string().nullable().optional(),
          contract_year: z.number().nullable().optional(),
          contract_amount: z.number().nullable().optional(),
          buyer: z.string().nullable().optional(),
          product_category: z.string().nullable().optional(),
          weapon_system: z.string().nullable().optional(),
        }),
      ),
      job_postings: z.array(
        z.object({
          title: z.string(),
          job_function: z.string().nullable().optional(),
          employment_type: z.string().nullable().optional(),
          experience_level: z.string().nullable().optional(),
          preferred_military_experience: z.string().nullable().optional(),
          required_skills: z.array(z.string()).optional(),
          preferred_skills: z.array(z.string()).optional(),
          location: z.string().nullable().optional(),
          deadline_at: z.string().nullable().optional(),
          posting_url: z.string().nullable().optional(),
          is_active: z.boolean().nullable().optional(),
        }),
      ),
      financials: z.array(
        z.object({
          fiscal_year: z.number(),
          revenue: z.number().nullable().optional(),
          operating_profit: z.number().nullable().optional(),
          net_income: z.number().nullable().optional(),
          employee_count: z.number().nullable().optional(),
          avg_salary: z.number().nullable().optional(),
        }),
      ).optional(),
      sources: z.array(
        z.object({
          source_grade: z.string(),
          source_type: z.string(),
          title: z.string().nullable().optional(),
          source_url: z.string(),
          publisher: z.string().nullable().optional(),
        }),
      ),
    }),
  ).optional(),
  career_centers: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      address: z.string(),
      phone: z.string(),
      jurisdiction: z.string(),
      match_reason: z.string().optional(),
    }),
  ).optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
