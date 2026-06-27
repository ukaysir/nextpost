import { readFile } from "node:fs/promises";
import path from "node:path";

export type AuditCompanyGap = {
  id: number;
  company_name: string;
  defense_field: string;
  total_contract_amount: number;
};

export type DataCoverageAudit = {
  mode: string;
  generated_at?: string;
  totals: Record<string, number>;
  field_counts: Record<string, number>;
  missing: {
    careers_url_top20_by_contract?: AuditCompanyGap[];
    financials_top20_by_contract?: AuditCompanyGap[];
  };
  priority_gaps: string[];
};

export type DataCoverageAuditState = {
  available: boolean;
  audit: DataCoverageAudit | null;
  message?: string;
};

const auditPath = path.join(process.cwd(), "supabase", "data_coverage_audit.json");

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
  );
}

function toCompanyGap(value: unknown): AuditCompanyGap | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const companyName = value.company_name;
  const defenseField = value.defense_field;
  const totalContractAmount = value.total_contract_amount;

  if (
    typeof id !== "number" ||
    typeof companyName !== "string" ||
    typeof defenseField !== "string" ||
    typeof totalContractAmount !== "number"
  ) {
    return null;
  }

  return {
    id,
    company_name: companyName,
    defense_field: defenseField,
    total_contract_amount: totalContractAmount,
  };
}

function toGapList(value: unknown): AuditCompanyGap[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(toCompanyGap).filter((item): item is AuditCompanyGap => Boolean(item));
}

function parseAudit(raw: unknown): DataCoverageAudit {
  if (!isRecord(raw)) {
    throw new Error("Audit payload is not an object.");
  }

  const missing = isRecord(raw.missing) ? raw.missing : {};
  const priorityGaps = Array.isArray(raw.priority_gaps)
    ? raw.priority_gaps.filter((item): item is string => typeof item === "string")
    : [];

  return {
    mode: typeof raw.mode === "string" ? raw.mode : "unknown",
    generated_at: typeof raw.generated_at === "string" ? raw.generated_at : undefined,
    totals: toNumberRecord(raw.totals),
    field_counts: toNumberRecord(raw.field_counts),
    missing: {
      careers_url_top20_by_contract: toGapList(missing.careers_url_top20_by_contract),
      financials_top20_by_contract: toGapList(missing.financials_top20_by_contract),
    },
    priority_gaps: priorityGaps,
  };
}

export async function getDataCoverageAudit(): Promise<DataCoverageAuditState> {
  try {
    const contents = await readFile(auditPath, "utf8");
    return {
      available: true,
      audit: parseAudit(JSON.parse(contents)),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";

    return {
      available: false,
      audit: null,
      message: `데이터 감사 파일을 읽을 수 없습니다. npm run audit:data:remote 실행 후 다시 확인하세요. (${detail})`,
    };
  }
}
