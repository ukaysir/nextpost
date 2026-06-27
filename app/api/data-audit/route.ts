import { NextRequest, NextResponse } from "next/server";
import { getDataCoverageAudit } from "@/lib/data-audit";
import { getRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json(
      { available: false, audit: null, message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  if (!user.isAdmin) {
    return NextResponse.json(
      { available: false, audit: null, message: "데이터 감사 화면에 접근할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const state = await getDataCoverageAudit();
  return NextResponse.json(state, { status: state.available ? 200 : 503 });
}
