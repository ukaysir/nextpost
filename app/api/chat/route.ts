import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildFallbackChat, runOllamaChat, runOpenAiChat } from "@/lib/chat";
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
    let provider: "ollama" | "openai" | "fallback" = process.env.OLLAMA_SERVER
      ? "ollama"
      : "openai";
    let answer: string;

    try {
      if (process.env.OLLAMA_SERVER) {
        answer = await runOllamaChat({
          messages: body.messages,
          analysisResult: body.analysisResult,
        });
      } else {
        answer = await runOpenAiChat({
          messages: body.messages,
          analysisResult: body.analysisResult,
        });
      }
    } catch (error) {
      console.error("Primary chat provider failed:", error);
      if (process.env.OLLAMA_SERVER && process.env.OPENAI_API_KEY) {
        try {
          provider = "openai";
          answer = await runOpenAiChat({
            messages: body.messages,
            analysisResult: body.analysisResult,
          });
        } catch (openAiError) {
          console.error("OpenAI chat failed, using deterministic fallback:", openAiError);
          provider = "fallback";
          answer = await buildFallbackChat({
            messages: body.messages,
            analysisResult: body.analysisResult,
          });
        }
      } else {
        provider = "fallback";
        answer = await buildFallbackChat({
          messages: body.messages,
          analysisResult: body.analysisResult,
        });
      }
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
