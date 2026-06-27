import { NextResponse } from "next/server";
import { getDataCoverageAudit } from "@/lib/data-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getDataCoverageAudit();
  return NextResponse.json(state, { status: state.available ? 200 : 503 });
}
