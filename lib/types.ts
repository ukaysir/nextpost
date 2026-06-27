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
  career_centers: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      address: z.string(),
      phone: z.string(),
      jurisdiction: z.string(),
    }),
  ).optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
