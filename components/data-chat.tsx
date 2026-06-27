"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  answer: string;
  provider: "openai" | "fallback";
};

const quickQuestions = [
  "추천 기업 중 어디부터 지원 준비하면 좋을까?",
  "내가 부족한 역량을 3개월 안에 보완하려면?",
  "지금 전역하는 것과 1년 뒤 전역하는 것의 차이는?",
];

export function DataChat({ analysisResult }: { analysisResult: AnalysisResult }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "분석 결과와 연결된 공공데이터를 기준으로 질문에 답할 수 있습니다. 추천 기업, 직무 역량, 교육 로드맵, 전역 타이밍을 물어보세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<"openai" | "fallback" | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  async function sendMessage(text = input) {
    const content = text.trim();
    if (!content || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          analysisResult,
        }),
      });
      const payload = (await response.json()) as ChatResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message || "답변 생성에 실패했습니다.");

      setProvider(payload.provider);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "대화 요청을 처리하지 못했습니다.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">데이터 기반 AI 상담</p>
          <h2 className="mt-1 text-xl font-semibold">분석 결과에 대해 직접 질문하기</h2>
        </div>
        {provider ? (
          <span className="rounded-full bg-[#eef1ea] px-3 py-1 text-xs text-[var(--muted-foreground)]">
            {provider === "openai" ? "OpenAI 응답" : "로컬 데이터 응답"}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3">
        {messages.map((message, index) => (
          <div
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
            key={`${message.role}-${index}`}
          >
            {message.role === "assistant" ? (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef5f2] text-[var(--primary)]">
                <Bot size={17} />
              </div>
            ) : null}
            <div
              className={cn(
                "max-w-[min(760px,85%)] rounded-lg px-4 py-3 text-sm leading-6",
                message.role === "user"
                  ? "whitespace-pre-wrap bg-[var(--primary)] text-white"
                  : "bg-[#f4f6f1] text-[#273835]",
              )}
            >
              {message.role === "assistant" ? (
                <MarkdownMessage content={message.content} />
              ) : (
                message.content
              )}
            </div>
            {message.role === "user" ? (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0ec] text-[var(--accent)]">
                <UserRound size={17} />
              </div>
            ) : null}
          </div>
        ))}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="animate-spin" size={16} />
            공공데이터와 분석 결과를 대조하는 중...
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {quickQuestions.map((question) => (
          <button
            className="focus-ring rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[#314540] hover:bg-[#f4f6f1]"
            disabled={isLoading}
            key={question}
            type="button"
            onClick={() => sendMessage(question)}
          >
            {question}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
        <textarea
          className="min-h-24 w-full resize-none rounded-md border border-[var(--border)] bg-white p-3 text-sm leading-6 outline-none focus:ring-4 focus:ring-[rgba(21,94,99,0.18)]"
          maxLength={1200}
          placeholder="예: 한화시스템과 LIG넥스원 중 내 경력에는 어디가 더 맞아?"
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 md:self-end"
          disabled={!canSend}
          type="button"
          onClick={() => sendMessage()}
        >
          {isLoading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          질문
        </button>
      </div>
    </section>
  );
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
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-[#162421]">{children}</strong>,
        code: ({ children }) => (
          <code className="rounded bg-white px-1.5 py-0.5 text-[13px] text-[#88311f]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-md bg-[#17211f] p-3 text-white">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-[var(--border)] bg-white px-2 py-1 font-semibold">
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
