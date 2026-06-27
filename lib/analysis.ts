import OpenAI from "openai";
import { getRuntimeAppData } from "@/lib/runtime-data";
import {
  AnalysisResult,
  AnalyzeInput,
  analysisResultSchema,
  Company,
  DEFENSE_FIELDS,
  EducationCert,
  JobRequirement,
} from "@/lib/types";

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

export type PreparedContext = {
  matchedField: string;
  matchedJobGroup: string;
  companies: Company[];
  jobRequirements: JobRequirement[];
  educationCerts: EducationCert[];
  glossaryTerms: string;
};

export async function prepareAnalysisContext(input: AnalyzeInput): Promise<PreparedContext> {
  const data = await getRuntimeAppData();
  const desiredField = DEFENSE_FIELDS.find((field) => field === input.desired_field);
  const mapping = data.careerMappings.find((item) => {
    const specialtyHit = input.specialty.includes(item.specialty_keyword);
    const positionHit = item.position_keywords.some((keyword) =>
      input.position.toLowerCase().includes(keyword.toLowerCase()),
    );
    return specialtyHit || positionHit;
  });

  const matchedField = desiredField ?? mapping?.defense_field ?? "기타";
  const matchedJobGroup = mapping?.job_group ?? "사업관리, 품질보증";
  const companies = data.companies
    .filter((company) => company.defense_field === matchedField)
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
    companies: fallbackCompanies,
    jobRequirements: data.jobRequirements
      .filter((job) => job.defense_field === matchedField)
      .slice(0, 4),
    educationCerts: data.educationCerts
      .filter((education) => education.defense_field === matchedField)
      .slice(0, 8),
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

  return {
    ...result,
    matched_field: context.matchedField,
    matched_job_group: context.matchedJobGroup,
    recommended_companies: result.recommended_companies
      .filter((company) => companyByName.has(company.company_name))
      .map((company) => {
        const source = companyByName.get(company.company_name);
        return {
          ...company,
          defense_field: source?.defense_field,
          total_contract_amount: source?.total_contract_amount,
          recent_contract_year: source?.recent_contract_year,
          is_cost_certified: source?.is_cost_certified,
          careers_page_url: source?.careers_page_url,
          avg_salary: source?.avg_salary,
          salary_source: source?.salary_source,
        };
      })
      .sort((a, b) => b.fit_score - a.fit_score),
  };
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
