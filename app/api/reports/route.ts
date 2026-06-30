import { NextRequest, NextResponse } from "next/server";
import { createSavedReport, deleteSavedReport, listSavedReports } from "@/lib/saved-reports";
import { getRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const userId = user?.id ?? request.nextUrl.searchParams.get("userId") ?? "test";
    const reports = await listSavedReports(userId, user?.accessToken);
    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "저장 리포트를 조회하지 못했습니다.",
        reports: [],
      },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const body = await request.json();
    if (!body?.result || !body?.input) {
      return NextResponse.json({ message: "저장할 리포트 데이터가 없습니다." }, { status: 400 });
    }

    const report = await createSavedReport({
      userId: user?.id ?? body.userId ?? "test",
      accessToken: user?.accessToken,
      title: body.title,
      input: body.input,
      result: body.result,
    });

    return NextResponse.json({
      report,
      shareUrl: `/reports/${report.share_id}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "리포트를 저장하지 못했습니다.",
      },
      { status: 503 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const body = await request.json();
    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ message: "삭제할 리포트 ID가 없습니다." }, { status: 400 });
    }

    await deleteSavedReport(body.id, user?.id ?? body.userId ?? "test", user?.accessToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "리포트를 삭제하지 못했습니다.",
      },
      { status: 503 },
    );
  }
}
