import { NextRequest, NextResponse } from "next/server";
import { getRuntimeAppData } from "@/lib/runtime-data";
import {
  buildFallbackAnalysis,
  prepareAnalysisContext,
  runOpenAiAnalysis,
} from "@/lib/analysis";
import { analyzeInputSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = analyzeInputSchema.parse(body);
    const context = await prepareAnalysisContext(input);

    let result;
    let aiProvider: "openai" | "fallback" = "openai";

    try {
      result = await runOpenAiAnalysis(input, context);
    } catch (error) {
      console.error("OpenAI analysis failed, using deterministic fallback:", error);
      aiProvider = "fallback";
      result = buildFallbackAnalysis(input, context);
    }

    return NextResponse.json({
      ...result,
      ai_provider: aiProvider,
      career_centers: (await getRuntimeAppData()).careerCenters.slice(0, 3),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "분석 요청을 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
