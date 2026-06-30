import { createClient } from "@supabase/supabase-js";
import { AnalyzeInput, AnalysisResult } from "@/lib/types";

export type SavedReportRecord = {
  id: string;
  share_id: string;
  user_id: string;
  title: string;
  input_payload: AnalyzeInput | Record<string, unknown>;
  result_payload: AnalysisResult;
  matched_field?: string | null;
  matched_job_group?: string | null;
  top_company?: string | null;
  top_score?: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type SavedReportSummary = Pick<
  SavedReportRecord,
  | "id"
  | "share_id"
  | "user_id"
  | "title"
  | "matched_field"
  | "matched_job_group"
  | "top_company"
  | "top_score"
  | "created_at"
>;

export type SaveReportPayload = {
  userId?: string;
  accessToken?: string;
  title?: string;
  input: AnalyzeInput | Record<string, unknown>;
  result: AnalysisResult;
};

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

function getClient(accessToken?: string) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase configuration is missing.");
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

function getTopCompany(result: AnalysisResult) {
  return result.recommended_companies?.[0] ?? null;
}

function buildReportTitle(input: AnalyzeInput | Record<string, unknown>, result: AnalysisResult) {
  const topCompany = getTopCompany(result)?.company_name;
  const matchedField = result.matched_field ?? result.field_market_summary?.defense_field;
  const specialty = typeof input.specialty === "string" ? input.specialty : "";
  const parts = [matchedField, specialty, topCompany].filter(Boolean);
  return parts.length ? `${parts.join(" · ")} 리포트` : "NEXTPOST 커리어 리포트";
}

export async function createSavedReport(payload: SaveReportPayload) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  const client = getClient(payload.accessToken);
  const topCompany = getTopCompany(payload.result);
  const row = {
    user_id: payload.userId ?? "test",
    title: payload.title?.trim() || buildReportTitle(payload.input, payload.result),
    input_payload: payload.input,
    result_payload: payload.result,
    matched_field: payload.result.matched_field ?? null,
    matched_job_group: payload.result.matched_job_group ?? null,
    top_company: topCompany?.company_name ?? null,
    top_score: topCompany?.fit_score ?? null,
    is_public: true,
  };

  const { data, error } = await client
    .from("saved_reports")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(`리포트 저장 실패: ${error.message}`);
  }

  const report = data as SavedReportRecord;
  const companyRows =
    payload.result.recommended_companies?.slice(0, 8).map((company) => ({
      report_id: report.id,
      user_id: row.user_id,
      company_name: company.company_name,
      defense_field: company.defense_field ?? null,
      fit_score: company.fit_score ?? null,
    })) ?? [];

  if (companyRows.length) {
    const { error: companyError } = await client.from("saved_companies").insert(companyRows);
    if (companyError) {
      console.warn("Saved report company snapshot failed:", companyError.message);
    }
  }

  return report;
}

export async function listSavedReports(userId = "test", accessToken?: string) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  const client = getClient(accessToken);
  const { data, error } = await client
    .from("saved_reports")
    .select(
      "id, share_id, user_id, title, matched_field, matched_job_group, top_company, top_score, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(`저장 리포트 조회 실패: ${error.message}`);
  }

  return (data ?? []) as SavedReportSummary[];
}

export async function deleteSavedReport(id: string, userId = "test", accessToken?: string) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  const client = getClient(accessToken);
  const { error } = await client
    .from("saved_reports")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`리포트 삭제 실패: ${error.message}`);
  }
}

export async function getSavedReportByShareId(shareId: string) {
  if (!hasSupabaseConfig()) return null;

  const client = getClient();
  const { data, error } = await client
    .from("saved_reports")
    .select("*")
    .eq("share_id", shareId)
    .eq("is_public", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`공유 리포트 조회 실패: ${error.message}`);
  }

  return data as SavedReportRecord;
}
