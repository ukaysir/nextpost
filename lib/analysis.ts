import OpenAI from "openai";
import { getRuntimeAppData } from "@/lib/runtime-data";
import {
  AnalysisResult,
  AnalyzeInput,
  analysisResultSchema,
  CareerMapping,
  Company,
  CompanyFinancial,
  CompanyProfile,
  CompanySource,
  ContractRecord,
  DEFENSE_FIELDS,
  EducationCert,
  IndustryStat,
  JobPosting,
  JobRequirement,
} from "@/lib/types";
import { formatWon, normalizeDefenseField } from "@/lib/utils";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "skill_translation",
    "recommended_companies",
    "skill_gap",
    "education_roadmap",
    "recommended_certs",
    "discharge_timing",
  ],
  properties: {
    skill_translation: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "keywords"],
      properties: {
        summary: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
      },
    },
    recommended_companies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["company_name", "fit_score", "reason", "recommended_positions"],
        properties: {
          company_name: { type: "string" },
          fit_score: { type: "integer", minimum: 0, maximum: 100 },
          reason: { type: "string" },
          recommended_positions: { type: "array", items: { type: "string" } },
        },
      },
    },
    skill_gap: {
      type: "object",
      additionalProperties: false,
      required: ["possessed", "missing", "analysis"],
      properties: {
        possessed: { type: "array", items: { type: "string" } },
        missing: { type: "array", items: { type: "string" } },
        analysis: { type: "string" },
      },
    },
    education_roadmap: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step", "level", "education_name", "education_link", "reason"],
        properties: {
          step: { type: "integer" },
          level: { type: "string" },
          education_name: { type: "string" },
          education_link: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    recommended_certs: { type: "array", items: { type: "string" } },
    discharge_timing: {
      type: "object",
      additionalProperties: false,
      required: ["now", "later", "recommendation"],
      properties: {
        now: { type: "string" },
        later: { type: "string" },
        recommendation: { type: "string" },
      },
    },
  },
};

const openAiTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 15000);

export type PreparedContext = {
  matchedField: string;
  matchedJobGroup: string;
  matchingEvidence?: CareerMapping & { matchedBy: string[] };
  companies: Company[];
  fieldCompanies: Company[];
  jobRequirements: JobRequirement[];
  educationCerts: EducationCert[];
  industryStats: IndustryStat[];
  companyProfiles: CompanyProfile[];
  companyFinancials: CompanyFinancial[];
  companySources: CompanySource[];
  contractRecords: ContractRecord[];
  jobPostings: JobPosting[];
  glossaryTerms: string;
};

export async function prepareAnalysisContext(input: AnalyzeInput): Promise<PreparedContext> {
  const data = await getRuntimeAppData();
  const desiredField = DEFENSE_FIELDS.find((field) => field === input.desired_field);
  const mappingMatches = data.careerMappings
    .map((item) => {
      const matchedBy: string[] = [];
      if (input.specialty.includes(item.specialty_keyword)) matchedBy.push("병과");
      if (
        item.position_keywords.some((keyword) =>
          input.position.toLowerCase().includes(keyword.toLowerCase()),
        )
      ) {
        matchedBy.push("보직");
      }
      return { item, matchedBy };
    })
    .filter((entry) => entry.matchedBy.length > 0);
  const mapping = mappingMatches[0]?.item;
  const matchingEvidence = mapping
    ? { ...mapping, matchedBy: mappingMatches[0].matchedBy }
    : undefined;

  const legacyMapping = data.careerMappings.find((item) => {
    const specialtyHit = input.specialty.includes(item.specialty_keyword);
    const positionHit = item.position_keywords.some((keyword) =>
      input.position.toLowerCase().includes(keyword.toLowerCase()),
    );
    return specialtyHit || positionHit;
  });

  const matchedField = normalizeDefenseField(
    desiredField ?? mapping?.defense_field ?? legacyMapping?.defense_field ?? "기타",
  );
  const matchedJobGroup = mapping?.job_group ?? legacyMapping?.job_group ?? "사업관리, 품질보증";
  const fieldCompanies = data.companies.filter(
    (company) => normalizeDefenseField(company.defense_field) === matchedField,
  );
  const companies = fieldCompanies
    .sort((a, b) => b.total_contract_amount - a.total_contract_amount)
    .slice(0, 7);

  const fallbackCompanies =
    companies.length > 0
      ? companies
      : data.companies
          .filter((company) => company.defense_field === "기타")
          .sort((a, b) => b.total_contract_amount - a.total_contract_amount)
          .slice(0, 7);

  return {
    matchedField,
    matchedJobGroup,
    matchingEvidence,
    companies: fallbackCompanies,
    fieldCompanies:
      fieldCompanies.length > 0
        ? fieldCompanies
        : data.companies.filter(
            (company) => normalizeDefenseField(company.defense_field) === "기타",
          ),
    jobRequirements: data.jobRequirements
      .filter((job) => normalizeDefenseField(job.defense_field) === matchedField)
      .slice(0, 4),
    educationCerts: data.educationCerts
      .filter((education) =>
        [matchedField, "공통"].includes(normalizeDefenseField(education.defense_field)),
      )
      .sort((a, b) => {
        const aCommon = normalizeDefenseField(a.defense_field) === "공통" ? 1 : 0;
        const bCommon = normalizeDefenseField(b.defense_field) === "공통" ? 1 : 0;
        return aCommon - bCommon;
      })
      .slice(0, 24),
    industryStats: data.industryStats,
    companyProfiles: data.companyProfiles,
    companyFinancials: data.companyFinancials,
    companySources: data.companySources,
    contractRecords: data.contractRecords,
    jobPostings: data.jobPostings,
    glossaryTerms: data.glossaryTerms,
  };
}

function compactCompanies(companies: Company[]) {
  return companies.map((company) => ({
    company_name: company.company_name,
    defense_field: company.defense_field,
    contract_rank_hint: company.total_contract_amount > 0 ? "계약정보 있음" : "계약정보 없음",
    recent_contract_year: company.recent_contract_year,
    is_cost_certified: company.is_cost_certified,
  }));
}

function compactJobs(jobs: JobRequirement[]) {
  return jobs.map((job) => ({
    job_title: job.job_title,
    required_skills: job.required_skills,
    preferred_military_exp: job.preferred_military_exp,
    related_weapon_system: job.related_weapon_system,
  }));
}

function compactEducation(educations: EducationCert[]) {
  return educations.map((education) => ({
    job_title: education.job_title,
    level: education.level,
    education_name: education.education_name,
    education_provider: education.education_provider,
    education_link: education.education_link,
    cert_name: education.cert_name,
  }));
}

export function enrichAnalysisResult(
  result: AnalysisResult,
  context: PreparedContext,
): AnalysisResult {
  const companyByName = new Map(context.companies.map((company) => [company.company_name, company]));
  const enrichedCompanies = result.recommended_companies
    .filter((company) => companyByName.has(company.company_name))
    .map((company) => {
      const source = companyByName.get(company.company_name);
      return {
        ...company,
        defense_field: normalizeDefenseField(source?.defense_field),
        total_contract_amount: source?.total_contract_amount,
        recent_contract_year: source?.recent_contract_year,
        is_cost_certified: source?.is_cost_certified,
        careers_page_url: source?.careers_page_url,
        avg_salary: source?.avg_salary,
        salary_source: source?.salary_source,
      };
    })
    .sort((a, b) => b.fit_score - a.fit_score);
  const companyDetails = buildCompanyDetails(enrichedCompanies, context);

  return {
    ...result,
    matched_field: context.matchedField,
    matched_job_group: context.matchedJobGroup,
    matching_evidence: buildMatchingEvidence(context),
    recommended_companies: enrichedCompanies,
    job_cards: context.jobRequirements.map((job) => ({
      job_title: job.job_title,
      required_skills: job.required_skills,
      preferred_military_exp: job.preferred_military_exp,
      related_weapon_system: job.related_weapon_system,
    })),
    field_market_summary: buildMarketSummary(context),
    industry_growth: buildIndustryGrowth(context.industryStats),
    education_groups: buildEducationGroups(context.educationCerts),
    glossary_matches: buildGlossaryMatches(context),
    data_reliability: enrichedCompanies.map((company) => ({
      company_name: company.company_name,
      score: calculateReliabilityScore(company, companyDetails),
      signals: buildReliabilitySignals(company, companyDetails),
    })),
    recommendation_evidence: enrichedCompanies.map((company) => ({
      company_name: company.company_name,
      evidence_points: buildRecommendationEvidence(company, companyDetails),
    })),
    data_coverage_summary: buildDataCoverageSummary(enrichedCompanies, companyDetails),
    company_details: companyDetails,
  };
}

function buildDataCoverageSummary(
  companies: AnalysisResult["recommended_companies"],
  companyDetails: NonNullable<AnalysisResult["company_details"]>,
): NonNullable<AnalysisResult["data_coverage_summary"]> {
  const count = companies.length;
  const withCareersUrl = companies.filter((company) => {
    const detail = companyDetails.find((item) => item.company_name === company.company_name);
    return Boolean(company.careers_page_url || detail?.careers_page_url);
  }).length;
  const withHomepage = companyDetails.filter((detail) => Boolean(detail.homepage_url)).length;
  const withProfile = companyDetails.filter(
    (detail) => Boolean(detail.summary) || detail.main_products.length > 0,
  ).length;
  const withContractRecords = companyDetails.filter((detail) => detail.contracts.length > 0).length;
  const withJobPostings = companyDetails.filter((detail) => detail.job_postings.length > 0).length;
  const withSalary = companies.filter((company) => Boolean(company.avg_salary)).length;
  const withSources = companyDetails.filter((detail) => detail.sources.length > 0).length;
  const knownGaps = [
    withSalary < count
      ? `평균연봉 공시값 ${count - withSalary}개사 미확보`
      : "",
    withCareersUrl < count
      ? `채용 URL ${count - withCareersUrl}개사 미확보`
      : "",
    withContractRecords < count
      ? `개별 계약 원천 ${count - withContractRecords}개사 미확보`
      : "",
    withJobPostings < count
      ? `기업별 채용 직무 ${count - withJobPostings}개사 미확보`
      : "",
  ].filter(Boolean);

  return {
    recommended_company_count: count,
    with_careers_url: withCareersUrl,
    with_homepage: withHomepage,
    with_profile: withProfile,
    with_contract_records: withContractRecords,
    with_job_postings: withJobPostings,
    with_salary: withSalary,
    with_sources: withSources,
    known_gaps: knownGaps,
  };
}

function buildCompanyDetails(
  companies: AnalysisResult["recommended_companies"],
  context: PreparedContext,
): NonNullable<AnalysisResult["company_details"]> {
  const companyByName = new Map(context.companies.map((company) => [company.company_name, company]));

  return companies.map((company) => {
    const source = companyByName.get(company.company_name);
    const profile = source
      ? context.companyProfiles.find((item) => item.company_id === source.id)
      : undefined;
    const contracts = source
      ? context.contractRecords
          .filter((item) => item.company_id === source.id || item.company_name === source.company_name)
          .sort((a, b) => (b.contract_amount ?? 0) - (a.contract_amount ?? 0))
          .slice(0, 5)
          .map((item) => ({
            contract_name: item.contract_name,
            contract_date: item.contract_date,
            contract_year: item.contract_year,
            contract_amount: item.contract_amount,
            buyer: item.buyer,
            product_category: item.product_category,
            weapon_system: item.weapon_system,
          }))
      : [];
    const jobPostings = source
      ? context.jobPostings
          .filter((item) => item.company_id === source.id)
          .slice(0, 5)
          .map((item) => ({
            title: item.title,
            job_function: item.job_function,
            employment_type: item.employment_type,
            experience_level: item.experience_level,
            preferred_military_experience: item.preferred_military_experience,
            required_skills: item.required_skills,
            preferred_skills: item.preferred_skills,
            location: item.location,
            deadline_at: item.deadline_at,
            posting_url: item.posting_url,
            is_active: item.is_active,
          }))
      : [];
    const sources = source
      ? context.companySources
          .filter((item) => item.company_id === source.id)
          .sort((a, b) => sourceGradeWeight(a.source_grade) - sourceGradeWeight(b.source_grade))
          .slice(0, 8)
          .map((item) => ({
            source_grade: item.source_grade,
            source_type: item.source_type,
            title: item.title,
            source_url: item.source_url,
            publisher: item.publisher,
          }))
      : [];
    const financials = source
      ? context.companyFinancials
          .filter((item) => item.company_id === source.id)
          .sort((a, b) => b.fiscal_year - a.fiscal_year)
          .slice(0, 5)
          .map((item) => ({
            fiscal_year: item.fiscal_year,
            revenue: item.revenue,
            operating_profit: item.operating_profit,
            net_income: item.net_income,
            employee_count: item.employee_count,
            avg_salary: item.avg_salary,
          }))
      : [];

    return {
      company_name: company.company_name,
      verified_name: profile?.verified_name ?? source?.company_name ?? null,
      homepage_url: profile?.homepage_url ?? null,
      careers_page_url: profile?.careers_page_url ?? company.careers_page_url ?? null,
      designation_date: source?.designation_date ?? null,
      address: profile?.address ?? null,
      stock_code: profile?.stock_code ?? null,
      dart_corp_code: profile?.dart_corp_code ?? null,
      summary: profile?.summary ?? null,
      main_products: profile?.main_products ?? [],
      data_quality_score: profile?.data_quality_score ?? null,
      contracts,
      job_postings: jobPostings,
      financials,
      sources,
    };
  });
}

function sourceGradeWeight(grade: string) {
  const order: Record<string, number> = {
    A_GOV_OFFICIAL: 1,
    B_COMPANY_OFFICIAL: 2,
    C_PUBLIC_OR_PARTNER: 3,
    D_SECONDARY_OR_COMMERCIAL: 4,
  };
  return order[grade] ?? 9;
}

function buildMatchingEvidence(context: PreparedContext): AnalysisResult["matching_evidence"] {
  if (!context.matchingEvidence) {
    return {
      position_keywords: [],
      defense_field: context.matchedField,
      job_group: context.matchedJobGroup,
      matched_by: ["희망 분야"],
    };
  }

  return {
    specialty_keyword: context.matchingEvidence.specialty_keyword,
    position_keywords: context.matchingEvidence.position_keywords,
    defense_field: context.matchingEvidence.defense_field,
    job_group: context.matchingEvidence.job_group,
    matched_by: context.matchingEvidence.matchedBy,
  };
}

function buildMarketSummary(context: PreparedContext): AnalysisResult["field_market_summary"] {
  const companies = context.fieldCompanies;
  return {
    defense_field: context.matchedField,
    company_count: companies.length,
    companies_with_contracts: companies.filter((company) => company.total_contract_amount > 0).length,
    cost_certified_count: companies.filter((company) => company.is_cost_certified).length,
    total_contract_amount: companies.reduce(
      (sum, company) => sum + (company.total_contract_amount ?? 0),
      0,
    ),
  };
}

function buildIndustryGrowth(stats: IndustryStat[]): AnalysisResult["industry_growth"] {
  const sorted = [...stats]
    .filter((stat) => stat.year > 0)
    .sort((a, b) => b.year - a.year);
  const latest = sorted[0];
  if (!latest) return undefined;

  const previous = sorted.find((stat) => stat.year < latest.year);
  const latestSales = latest.sales ?? null;
  const previousSales = previous?.sales ?? null;
  const salesGrowthRate =
    latestSales && previousSales
      ? Number((((latestSales - previousSales) / previousSales) * 100).toFixed(1))
      : null;

  return {
    latest_year: latest.year,
    latest_sales: latestSales,
    latest_operating_profit_rate: latest.operating_profit_rate ?? null,
    previous_year: previous?.year ?? null,
    previous_sales: previousSales,
    sales_growth_rate: salesGrowthRate,
  };
}

function buildEducationGroups(educations: EducationCert[]): AnalysisResult["education_groups"] {
  const levels = [
    "입문",
    "중급",
    "심화",
    "공통",
    ...Array.from(new Set(educations.map((education) => education.level))).filter(
      (level) => !["입문", "중급", "심화", "공통"].includes(level),
    ),
  ];
  return levels
    .map((level) => ({
      level,
      items: [
        ...educations
          .filter(
            (education) =>
              education.level === level &&
              normalizeDefenseField(education.defense_field) !== "공통",
          )
          .slice(0, 3),
        ...educations
          .filter(
            (education) =>
              education.level === level &&
              normalizeDefenseField(education.defense_field) === "공통",
          )
          .slice(0, 2),
      ]
        .map((education) => ({
          education_name: education.education_name,
          education_provider: education.education_provider,
          education_link: education.education_link,
          cert_name: education.cert_name,
          job_title: education.job_title,
          defense_field: normalizeDefenseField(education.defense_field),
        })),
    }))
    .filter((group) => group.items.length > 0);
}

function buildGlossaryMatches(context: PreparedContext): AnalysisResult["glossary_matches"] {
  const keywords = [
    context.matchedField,
    ...context.matchedJobGroup.split(/[,/·\s]+/),
    ...context.jobRequirements.flatMap((job) => job.required_skills),
  ].filter((keyword) => keyword.length >= 2);

  return context.glossaryTerms
    .split("\n")
    .map((line) => {
      const normalized = line.replace(/^-\s*/, "");
      const [term, ...descriptionParts] = normalized.split(":");
      return {
        term: term?.trim() ?? "",
        description: descriptionParts.join(":").trim(),
      };
    })
    .filter(
      (item) =>
        item.term &&
        item.description &&
        keywords.some((keyword) => `${item.term} ${item.description}`.includes(keyword)),
    )
    .slice(0, 6);
}

function calculateReliabilityScore(
  company: AnalysisResult["recommended_companies"][number],
  companyDetails: NonNullable<AnalysisResult["company_details"]>,
) {
  const detail = companyDetails.find((item) => item.company_name === company.company_name);
  return Math.min(
    100,
    35 +
      (company.total_contract_amount ? 25 : 0) +
      (company.recent_contract_year ? 15 : 0) +
      (company.is_cost_certified ? 10 : 0) +
      (company.careers_page_url ? 10 : 0) +
      (company.avg_salary ? 5 : 0) +
      (detail?.summary ? 5 : 0) +
      (detail?.contracts.length ? 5 : 0) +
      (detail?.job_postings.length ? 5 : 0) +
      (detail?.sources.some((source) => source.source_grade === "A_GOV_OFFICIAL") ? 5 : 0) +
      (detail?.sources.some((source) => source.source_grade === "B_COMPANY_OFFICIAL") ? 5 : 0),
  );
}

function buildReliabilitySignals(
  company: AnalysisResult["recommended_companies"][number],
  companyDetails: NonNullable<AnalysisResult["company_details"]>,
) {
  const detail = companyDetails.find((item) => item.company_name === company.company_name);
  const signals = [
    company.total_contract_amount ? "계약정보 있음" : "계약정보 없음",
    company.recent_contract_year ? `최근 계약 ${company.recent_contract_year}년` : "최근 계약연도 없음",
    company.is_cost_certified ? "원가관리 인증" : "원가관리 인증 미확인",
    company.careers_page_url ? "채용 URL 보유" : "채용 URL 없음",
    company.avg_salary ? "연봉 공시값 있음" : "연봉 공시값 없음",
    detail?.summary ? "기업 프로필 있음" : "기업 프로필 없음",
    detail?.contracts.length ? `계약 원천 ${detail.contracts.length}건` : "계약 원천 없음",
    detail?.job_postings.length ? `채용 직무 ${detail.job_postings.length}건` : "채용 직무 없음",
    detail?.sources.length ? `출처 ${detail.sources.length}건` : "출처 없음",
  ];
  return signals;
}

function buildRecommendationEvidence(
  company: AnalysisResult["recommended_companies"][number],
  companyDetails: NonNullable<AnalysisResult["company_details"]>,
) {
  const detail = companyDetails.find((item) => item.company_name === company.company_name);
  const evidence = [
    `${company.defense_field ?? "매칭 분야"} 분야 추천 점수 ${company.fit_score}점`,
    company.total_contract_amount
      ? `누적 계약 규모 ${formatWon(company.total_contract_amount)}`
      : "계약 규모 원천 미확보",
    company.recent_contract_year
      ? `최근 계약연도 ${company.recent_contract_year}년`
      : "최근 계약연도 미확보",
    company.is_cost_certified ? "원가관리 인증 기업" : "원가관리 인증 미확인",
    company.careers_page_url ? "채용 URL 보유" : "채용 URL 미확보",
    company.avg_salary ? `평균연봉 ${company.avg_salary.toLocaleString("ko-KR")}만원` : "평균연봉 공시 미확보",
    detail?.contracts[0]?.contract_name
      ? `대표 계약: ${detail.contracts[0].contract_name}`
      : "개별 계약명 미확보",
    detail?.job_postings[0]?.title
      ? `채용 직무: ${detail.job_postings[0].title}`
      : "기업별 채용 직무 미확보",
    detail?.sources[0]
      ? `최상위 출처: ${detail.sources[0].source_grade}`
      : "출처 링크 미확보",
  ];

  return evidence.slice(0, 9);
}

function buildPrompt(input: AnalyzeInput, context: PreparedContext, glossaryTerms: string) {
  const compactGlossary = glossaryTerms.split("\n").slice(0, 20).join("\n");
  return `## 분석 대상자 정보
- 군별: ${input.military_branch}
- 계급: ${input.rank}
- 병과: ${input.specialty}
- 보직: ${input.position}
- 복무년수: ${input.years_served}년
- 전공: ${input.major}
- 보유 자격증: ${input.certifications.length ? input.certifications.join(", ") : "없음"}
- 희망 분야: ${input.desired_field}
- 서버 규칙 매핑 분야: ${context.matchedField}
- 서버 규칙 매핑 직무군: ${context.matchedJobGroup}

## 추천 후보 기업 데이터
${JSON.stringify(compactCompanies(context.companies))}

## 해당 분야 직무 요구역량
${JSON.stringify(compactJobs(context.jobRequirements))}

## 추천 가능 교육·자격증
${JSON.stringify(compactEducation(context.educationCerts))}

## 방산 용어 참고
${compactGlossary}

위 데이터 안에서만 회사, 직무, 교육, 자격증을 선택하세요. 제공되지 않은 회사, 교육명, 자격증명은 절대 생성하지 마세요.`;
}

function parseModelJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

export async function runOpenAiAnalysis(input: AnalyzeInput, context: PreparedContext) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("__USER_PROVIDED")) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const systemPrompt =
    "당신은 전역 간부의 방산 취업을 돕는 커리어 분석 전문가입니다. 추천은 제공된 데이터 안에서만 수행하고, 한국어로 간결하고 실무적으로 작성하세요.";
  const userPrompt = buildPrompt(input, context, context.glossaryTerms);
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    maxRetries: 0,
    timeout: openAiTimeoutMs,
  });

  if (process.env.OPENAI_BASE_URL) {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: `${systemPrompt} 반드시 JSON만 출력하세요.` },
        {
          role: "user",
          content: `${userPrompt}

## 반드시 따라야 할 출력 JSON 스키마
${JSON.stringify(responseSchema)}

출력은 위 스키마를 만족하는 JSON 객체 하나만 허용됩니다. markdown 코드블록이나 설명 문장을 붙이지 마세요.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature: 0.2,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI-compatible 응답이 비어 있습니다.");
    const parsed = analysisResultSchema.parse(parseModelJson(content));
    return enrichAnalysisResult(parsed, context);
  }

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "nextpost_analysis",
        strict: true,
        schema: responseSchema,
      },
    },
    max_output_tokens: 1200,
  });

  const content = response.output_text;
  if (!content) throw new Error("OpenAI 응답이 비어 있습니다.");

  const parsed = analysisResultSchema.parse(parseModelJson(content));
  return enrichAnalysisResult(parsed, context);
}

export function buildFallbackAnalysis(input: AnalyzeInput, context: PreparedContext): AnalysisResult {
  const topJobs = context.jobRequirements.slice(0, 3);
  const possessed = [
    input.major,
    input.specialty,
    input.position,
    ...input.certifications,
  ].filter(Boolean);
  const missing = Array.from(new Set(topJobs.flatMap((job) => job.required_skills))).slice(0, 6);
  const roadmap = context.educationCerts.slice(0, 5).map((education, index) => ({
    step: index + 1,
    level: education.level,
    education_name: education.education_name,
    education_link: education.education_link,
    reason: `${education.job_title} 직무 요구역량 보완에 직접 연결됩니다.`,
  }));

  return enrichAnalysisResult(
    {
      skill_translation: {
        summary: `${input.position} 경험은 ${context.matchedField} 분야의 ${context.matchedJobGroup} 역량으로 전환해 설명할 수 있습니다. 복무 중 장비 운용, 조직 조율, 절차 기반 문제 해결 경험을 방산 직무 언어로 정리하는 것이 핵심입니다.`,
        keywords: Array.from(
          new Set([
            context.matchedField,
            context.matchedJobGroup,
            "무기체계 운용",
            "정비/운용 절차",
            "품질보증",
            "시험평가",
          ]),
        ),
      },
      recommended_companies: context.companies.map((company, index) => ({
        company_name: company.company_name,
        fit_score: Math.max(72, 94 - index * 4),
        reason: `${company.defense_field} 분야 지정업체이며, 공개 계약 데이터 기준 후보군 내 사업 규모가 높아 관련 직무 탐색 우선순위가 높습니다.`,
        recommended_positions: topJobs.slice(0, 2).map((job) => job.job_title),
      })),
      skill_gap: {
        possessed,
        missing,
        analysis:
          "현재 군 경력은 도메인 이해와 운용 경험 측면에서 강점이 있습니다. 민간 방산 직무 전환을 위해서는 요구역량 데이터에 있는 개발도구, 시험평가, 품질/체계공학 역량을 우선 보완해야 합니다.",
      },
      education_roadmap: roadmap,
      recommended_certs: Array.from(
        new Set(context.educationCerts.map((education) => education.cert_name).filter(Boolean)),
      ).slice(0, 5),
      discharge_timing: {
        now: "지금 전역하면 현장 운용 경험을 강점으로 지원할 수 있으나, 민간 직무 키워드와 교육 이수 증빙은 보완이 필요합니다.",
        later:
          "1~2년 더 복무하며 목표 분야와 연결되는 장비, 사업관리, 정비, 시험평가 경험을 명확히 쌓으면 직무 적합도 설명이 쉬워집니다.",
        recommendation:
          "목표 기업을 먼저 좁히고 3개월 단위로 교육·자격증·프로젝트 기록을 정리한 뒤 전역 시점을 결정하는 전략이 적합합니다.",
      },
    },
    context,
  );
}
