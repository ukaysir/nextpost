import { NextRequest, NextResponse } from "next/server";
import { getRuntimeAppData } from "@/lib/runtime-data";
import {
  buildFallbackAnalysis,
  prepareAnalysisContext,
  runOpenAiAnalysis,
} from "@/lib/analysis";
import { analyzeInputSchema, CareerCenter } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = analyzeInputSchema.parse(body);
    const context = await prepareAnalysisContext(input);

    let result;
    let aiProvider: "openai" | "fallback" = "openai";

    if (process.env.NEXTPOST_ANALYSIS_PROVIDER === "fallback") {
      aiProvider = "fallback";
      result = buildFallbackAnalysis(input, context);
    } else {
      try {
        result = await runOpenAiAnalysis(input, context);
      } catch (error) {
        console.error("OpenAI analysis failed, using deterministic fallback:", error);
        aiProvider = "fallback";
        result = buildFallbackAnalysis(input, context);
      }
    }

    return NextResponse.json({
      ...result,
      ai_provider: aiProvider,
      career_centers: selectCareerCenters(
        (await getRuntimeAppData()).careerCenters,
        input.preferred_region,
      ),
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

function selectCareerCenters(centers: CareerCenter[], preferredRegion?: string) {
  const region = preferredRegion?.trim();
  if (!region) {
    return centers.slice(0, 3).map((center) => ({
      ...center,
      match_reason: "기본 추천",
    }));
  }

  const scored = centers
    .map((center) => {
      const haystack = `${center.name} ${center.address} ${center.jurisdiction}`;
      const score = haystack.includes(region) ? 2 : 0;
      return {
        ...center,
        match_reason: score > 0 ? `${region} 기준 매칭` : "보조 추천",
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, 3);

  return scored.map((center) => ({
    id: center.id,
    name: center.name,
    address: center.address,
    phone: center.phone,
    jurisdiction: center.jurisdiction,
    match_reason: center.match_reason,
  }));
}
