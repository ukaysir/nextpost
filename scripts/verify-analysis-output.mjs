import { spawn } from "node:child_process";
import path from "node:path";

const port = Number(process.env.VERIFY_PORT ?? 3123);
const baseUrl = `http://127.0.0.1:${port}`;
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

function cleanEnv() {
  const env = {
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    USERPROFILE: process.env.USERPROFILE,
    HOME: process.env.HOME,
    PATH: process.env.Path ?? process.env.PATH,
    NODE_ENV: "production",
    NEXTPOST_ANALYSIS_PROVIDER: "fallback",
    OPENAI_TIMEOUT_MS: "1000",
    NEXT_TELEMETRY_DISABLED: "1",
  };

  return Object.fromEntries(
    Object.entries(env).filter((entry) => typeof entry[1] === "string" && entry[1].length > 0),
  );
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(child) {
  let lastError = "";

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited early with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/data-audit`);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(500);
  }

  throw new Error(`Server did not become ready: ${lastError}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

async function verifyAnalysisResponse() {
  const input = {
    military_branch: "육군",
    rank: "대위",
    specialty: "통신",
    position: "통신전자장비 정비담당",
    years_served: 7,
    major: "전자공학",
    certifications: ["정보처리기사"],
    desired_field: "잘 모름",
    preferred_region: "서울",
  };

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  assert(response.ok, `Analyze API failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  assert(payload.ai_provider === "fallback", "Analyze API did not use fallback provider.");
  assert(payload.matching_evidence?.defense_field, "Missing matching_evidence.");
  assert(hasItems(payload.job_cards), "Missing job_cards.");
  assert(payload.field_market_summary?.company_count > 0, "Missing field_market_summary.");
  assert(payload.industry_growth?.latest_year >= 2024, "Missing industry_growth latest year.");
  assert(hasItems(payload.education_groups), "Missing education_groups.");
  assert(hasItems(payload.glossary_matches), "Missing glossary_matches.");
  assert(hasItems(payload.data_reliability), "Missing data_reliability.");
  assert(hasItems(payload.recommendation_evidence), "Missing recommendation_evidence.");
  assert(payload.data_coverage_summary?.recommended_company_count > 0, "Missing data_coverage_summary.");
  assert(hasItems(payload.company_details), "Missing company_details.");
  assert(hasItems(payload.career_centers), "Missing career_centers.");

  return {
    matched_field: payload.matched_field,
    recommended_companies: payload.recommended_companies.length,
    job_cards: payload.job_cards.length,
    education_groups: payload.education_groups.length,
    glossary_matches: payload.glossary_matches.length,
    reliability_rows: payload.data_reliability.length,
    evidence_rows: payload.recommendation_evidence.length,
    career_center_reasons: payload.career_centers.map((center) => center.match_reason),
  };
}

async function main() {
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: cleanEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";

  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  try {
    await waitForServer(child);
    const summary = await verifyAnalysisResponse();
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (logs.trim()) {
      console.error(logs.trim().split("\n").slice(-30).join("\n"));
    }
    throw error;
  } finally {
    if (child.exitCode === null) {
      child.kill();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
