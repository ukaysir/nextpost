import OpenAI from "openai";
import { getRuntimeAppData } from "@/lib/runtime-data";
import { AnalysisResult } from "@/lib/types";
import { formatWon } from "@/lib/utils";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatContextInput = {
  messages: ChatMessage[];
  analysisResult?: AnalysisResult;
};

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

async function selectRelevantContext({ messages, analysisResult }: ChatContextInput) {
  const data = await getRuntimeAppData();
  const lastUserMessage = getLastUserMessage(messages);
  const matchedField = analysisResult?.matched_field;
  const recommendedNames = new Set(
    analysisResult?.recommended_companies?.map((company) => company.company_name) ?? [],
  );

  const fieldCompanies = data.companies
    .filter((company) => !matchedField || company.defense_field === matchedField)
    .sort((a, b) => b.total_contract_amount - a.total_contract_amount)
    .slice(0, 12);

  const mentionedCompanies = data.companies.filter((company) =>
    lastUserMessage.includes(company.company_name),
  );

  const companies = [
    ...mentionedCompanies,
    ...fieldCompanies.filter((company) => recommendedNames.has(company.company_name)),
    ...fieldCompanies,
  ]
    .filter(
      (company, index, array) =>
        array.findIndex((item) => item.company_name === company.company_name) === index,
    )
    .slice(0, 12);

  const jobs = data.jobRequirements
    .filter((job) => !matchedField || job.defense_field === matchedField)
    .slice(0, 8);

  const educations = data.educationCerts
    .filter((education) => !matchedField || education.defense_field === matchedField)
    .slice(0, 8);

  return {
    matchedField,
    analysisSummary: analysisResult
      ? {
          matched_field: analysisResult.matched_field,
          matched_job_group: analysisResult.matched_job_group,
          skill_translation: analysisResult.skill_translation,
          skill_gap: analysisResult.skill_gap,
          recommended_companies: analysisResult.recommended_companies.slice(0, 5),
          recommended_certs: analysisResult.recommended_certs,
          discharge_timing: analysisResult.discharge_timing,
        }
      : undefined,
    companies: companies.slice(0, 8).map((company) => ({
      company_name: company.company_name,
      defense_field: company.defense_field,
      total_contract_amount: company.total_contract_amount,
      total_contract_amount_label: formatWon(company.total_contract_amount),
      recent_contract_year: company.recent_contract_year,
      is_cost_certified: company.is_cost_certified,
      careers_page_url: company.careers_page_url,
    })),
    jobs: jobs.map((job) => ({
      job_title: job.job_title,
      defense_field: job.defense_field,
      required_skills: job.required_skills,
      preferred_military_exp: job.preferred_military_exp,
      related_weapon_system: job.related_weapon_system,
    })),
    educations: educations.map((education) => ({
      job_title: education.job_title,
      level: education.level,
      education_name: education.education_name,
      education_provider: education.education_provider,
      education_link: education.education_link,
      cert_name: education.cert_name,
    })),
    careerCenters: data.careerCenters,
  };
}

async function buildMessagesForModel(input: ChatContextInput) {
  const recentMessages = input.messages.slice(-8);
  const context = await selectRelevantContext(input);

  return [
    {
      role: "system" as const,
      content:
        "당신은 NEXTPOST의 방산 커리어 상담 AI입니다. 반드시 제공된 분석 결과와 공공데이터 컨텍스트에 근거해 답하세요. 데이터에 없는 회사, 채용공고, 연봉, 교육을 사실처럼 만들지 마세요. 정보가 부족하면 부족하다고 말하고, 확인 가능한 다음 행동을 제시하세요. 답변은 한국어로 3~7문장 또는 짧은 bullet로 작성하세요.",
    },
    {
      role: "user" as const,
      content: `## 현재 분석/공공데이터 컨텍스트
${JSON.stringify(context, null, 2)}

## 최근 대화
${recentMessages.map((message) => `${message.role}: ${message.content}`).join("\n")}`,
    },
  ];
}

export async function runOpenAiChat(input: ChatContextInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("__USER_PROVIDED")) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const messages = await buildMessagesForModel(input);
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  if (process.env.OPENAI_BASE_URL) {
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.2,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI-compatible 응답이 비어 있습니다.");
    return content;
  }

  const response = await client.responses.create({
    model,
    input: messages,
    max_output_tokens: 500,
  });

  if (!response.output_text) {
    throw new Error("OpenAI 응답이 비어 있습니다.");
  }

  return response.output_text;
}

export async function buildFallbackChat(input: ChatContextInput) {
  const context = await selectRelevantContext(input);
  const topCompany = context.companies[0];
  const topJob = context.jobs[0];
  const topEducation = context.educations[0];

  if (!topCompany && !topJob) {
    return "현재 연결된 데이터에서 답변 근거를 찾지 못했습니다. 먼저 커리어 분석을 실행한 뒤 결과 화면에서 질문하면 추천 기업과 직무 데이터를 기준으로 답할 수 있습니다.";
  }

  return [
    `현재 데이터 기준으로는 ${context.matchedField ?? "매칭 분야"} 분야를 중심으로 보는 것이 적절합니다.`,
    topCompany
      ? `우선 검토 기업은 ${topCompany.company_name}이며, 공개 계약 데이터 기준 계약 규모는 ${topCompany.total_contract_amount_label}입니다.`
      : "",
    topJob
      ? `연결 가능한 직무는 ${topJob.job_title}이고, 요구역량은 ${topJob.required_skills.slice(0, 4).join(", ")}입니다.`
      : "",
    topEducation
      ? `보완 학습은 ${topEducation.education_name}부터 확인하는 흐름이 좋습니다.`
      : "",
    "OpenAI 응답을 받지 못해 로컬 데이터 기반 요약으로 답변했습니다.",
  ]
    .filter(Boolean)
    .join(" ");
}
