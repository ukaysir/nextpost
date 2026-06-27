import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildFallbackChat, runOpenAiChat } from "@/lib/chat";
import { analysisResultSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(3000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
  analysisResult: analysisResultSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = chatRequestSchema.parse(await request.json());
    let provider: "openai" | "fallback" = "openai";
    let answer: string;

    try {
      answer = await runOpenAiChat({
        messages: body.messages,
        analysisResult: body.analysisResult,
      });
    } catch (error) {
      console.error("OpenAI chat failed, using deterministic fallback:", error);
      provider = "fallback";
      answer = await buildFallbackChat({
        messages: body.messages,
        analysisResult: body.analysisResult,
      });
    }

    return NextResponse.json({ answer, provider });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "대화 요청을 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
