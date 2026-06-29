"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";


type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};


type ServerChatResponse = {
  answer?: string;
provider?: "openai" | "fallback";
  message?: string;
};

const suggestions = [
  "추천 기업 중 어디부터 준비하면 좋을까?",
  "추천 근거를 계약, 채용, 재무 데이터 기준으로 비교해줘.",
  "3개월 안에 보완해야 할 역량만 우선순위로 정리해줘.",
  "지금 전역하는 것과 1년 뒤 전역하는 것의 차이를 알려줘.",
];

export function DataChat({
  analysisResult,
  className,
}: {
  analysisResult: AnalysisResult;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "분석 결과와 연결된 공공 데이터, 채용 정보, 기업 재무 데이터를 기준으로 답변합니다. 추천 기업, 직무 역량, 교육 로드맵, 전역 타이밍을 구체적으로 물어보세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<"openai" | "fallback" | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  async function sendMessage(text = input) {
    const content = text.trim();
    if (!content || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const serverReply = await askServerChat(nextMessages, analysisResult);
      setProvider(serverReply.provider ?? "openai");
      setMessages((current) => [...current, { role: "assistant", content: serverReply.answer }]);
    } catch (error) {
      console.error("Chat request failed:", error);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "AI 응답을 받지 못했습니다. 잠시 뒤 다시 시도해주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section
      className={cn(
        "np-card flex h-[560px] min-h-[500px] flex-col overflow-hidden p-0 md:h-[min(760px,calc(100vh-112px))] md:min-h-[560px]",
        className,
      )}
    >
      <div className="shrink-0 border-b border-[#303846] bg-[#252C36] px-4 py-3 text-white md:px-6 md:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold text-white/75 md:text-sm">
              <Sparkles size={15} />
              NEXTPOST AI 상담
            </p>
            <h2 className="mt-1 text-base font-black text-white md:text-xl">
              리포트를 보면서 바로 질문하기
            </h2>
          </div>
          {provider ? (
            <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
              {providerLabel(provider)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-5 md:py-5">
          <div className="grid content-start gap-3 md:gap-4">
            {messages.map((message, index) => (
              <div
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
                key={`${message.role}-${index}`}
              >
                {message.role === "assistant" ? (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#252C36] text-white">
                    <Bot size={17} />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "min-w-0 max-w-[94%] overflow-hidden rounded-xl px-3 py-2.5 text-sm leading-6 md:max-w-[84%] md:px-4 md:py-3 md:leading-7",
                    message.role === "user"
                      ? "whitespace-pre-wrap bg-[#252C36] text-white"
                      : "border border-[var(--border)] bg-white text-[var(--foreground)]",
                  )}
                >
                  {message.role === "assistant" ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
                {message.role === "user" ? (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF1F3] text-[#252C36]">
                    <UserRound size={17} />
                  </div>
                ) : null}
              </div>
            ))}
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-[var(--muted-foreground)]">
                <Loader2 className="animate-spin" size={16} />
                NEXTPOST AI가 리포트 내용을 확인하는 중입니다.
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--border)] bg-white px-3 py-3 md:px-5 md:py-4">
          <div className="mb-3">
            <button
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[#f8fafc] px-3 text-xs font-bold text-[var(--caption)]"
              type="button"
              onClick={() => setShowSuggestions((current) => !current)}
            >
              예시 질문
              <ChevronDown
                className={cn("transition", showSuggestions ? "rotate-180" : "rotate-0")}
                size={15}
              />
            </button>
            {showSuggestions ? (
              <div className="mt-2 grid gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    className="focus-ring rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-left text-xs font-medium text-[var(--caption)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)] md:rounded-full md:text-sm"
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <textarea
              className="focus-ring min-h-20 w-full resize-none rounded-lg border border-[var(--border)] bg-[#f9fafb] p-3 text-sm leading-6 outline-none md:min-h-24"
              maxLength={1200}
              placeholder="예: 한화에어로스페이스와 LIG넥스원 중 내 경력에는 어디가 더 맞아?"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#252C36] px-5 font-semibold text-white transition hover:bg-[#1C232C] disabled:cursor-not-allowed disabled:opacity-50 md:h-12 md:self-end"
              disabled={!canSend}
              type="button"
              onClick={() => sendMessage()}
            >
              {isLoading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              질문
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


async function askServerChat(messages: ChatMessage[], analysisResult: AnalysisResult): Promise<{
  answer: string;
  provider?: "openai" | "fallback";
}> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, analysisResult }),
  });
  const payload = (await response.json()) as ServerChatResponse;
  if (!response.ok) throw new Error(payload.message || "OpenAI API 응답을 받지 못했습니다.");
  if (!payload.answer) throw new Error("OpenAI API 응답 본문이 비어 있습니다.");
  return { answer: payload.answer, provider: payload.provider };
}

function providerLabel(provider: "openai" | "fallback") {
  const labels: Record<typeof provider, string> = {
    openai: "OpenAI",
    fallback: "데이터 요약",
  };
  return labels[provider] ?? provider;
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, ...props }) => (
          <a
            {...props}
            className="font-semibold text-[var(--primary)] underline underline-offset-4"
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
        p: ({ children }) => <p className="my-2 break-words first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--foreground)]">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[13px] text-[var(--foreground)]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-3 max-w-full overflow-x-auto rounded-md bg-[var(--foreground)] p-3 text-white">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-3 max-w-full overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-[var(--border)] bg-[var(--background)] px-2 py-1 font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-[var(--border)] bg-white px-2 py-1">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
