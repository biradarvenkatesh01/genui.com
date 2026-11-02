"use client";

import { Fragment, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CornerDownRight, RotateCw } from "lucide-react";
import { LogoMark } from "@/components/logo";
import type { AssistantMessage, ChatMessage, Version } from "@/lib/generation/use-generation";
import { PROMPT_IDEAS } from "@/lib/generation/categories";
import { cn } from "@/lib/cn";

type Props = {
  messages: ChatMessage[];
  versions: Version[];
  activeId: string | null;
  onSelectVersion: (id: string) => void;
  onRetry: (text: string, target?: string) => void;
  onSuggestion: (text: string) => void;
};

/** The conversation: the user's messages, GenUI's replies and the versions they produced. */
export function ChatThread({ messages, versions, activeId, onSelectVersion, onRetry, onSuggestion }: Props) {
  const end = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);
  const lastKey = last ? `${last.id}:${last.text.length}:${last.role === "assistant" ? last.status : ""}` : "";

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lastKey]);

  if (!messages.length) {
    return (
      <div className="px-4 py-5">
        <p className="eyebrow mb-3">Try one of these</p>
        <div className="space-y-2">
          {PROMPT_IDEAS.slice(0, 4).map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => onSuggestion(idea)}
              className="block w-full rounded-xl border border-line px-3.5 py-3 text-left text-[13px] leading-snug text-fg-muted transition-colors hover:border-line-strong hover:bg-bg-elevated hover:text-fg"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div role="log" aria-live="polite" aria-label="Conversation" className="space-y-5 px-4 py-5">
      {messages.map((m, i) =>
        m.role === "user" ? (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="ml-8 flex flex-col items-end"
          >
            {m.target && (
              <span className="mb-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-fg-subtle">
                <CornerDownRight className="size-3" /> {m.target}
              </span>
            )}
            <p className="rounded-2xl rounded-br-md bg-active px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-fg">
              {m.text}
            </p>
          </motion.div>
        ) : (
          <Reply
            key={m.id}
            message={m}
            versions={versions}
            activeId={activeId}
            onSelectVersion={onSelectVersion}
            onRetry={() => {
              const prev = messages[i - 1];
              if (prev?.role === "user") onRetry(prev.text, prev.target);
            }}
          />
        ),
      )}
      <div ref={end} />
    </div>
  );
}

function Reply({
  message: m,
  versions,
  activeId,
  onSelectVersion,
  onRetry,
}: {
  message: AssistantMessage;
  versions: Version[];
  activeId: string | null;
  onSelectVersion: (id: string) => void;
  onRetry: () => void;
}) {
  const vIndex = m.versionId ? versions.findIndex((v) => v.id === m.versionId) : -1;
  const version = vIndex >= 0 ? versions[vIndex] : null;
  const busy = m.status === "thinking" || m.status === "replying" || m.status === "coding";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mr-4 flex gap-2.5"
    >
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-line bg-bg-elevated text-fg">
        <LogoMark className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2.5">
        {m.status === "thinking" && <Status label="Thinking" />}
        {m.text && <RichText text={m.text} />}
        {m.status === "replying" && !m.text && <Status label="Writing" />}
        {m.status === "coding" && <Status label={m.lines ? `Building the component · ${m.lines} lines` : "Building the component"} />}
        {m.status === "stopped" && <p className="font-mono text-[11px] text-fg-subtle">Stopped.</p>}
        {m.status === "error" && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">{m.error}</span>
            <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 font-medium underline-offset-2 hover:underline">
              <RotateCw className="size-3" /> Retry
            </button>
          </div>
        )}
        {version && (
          <button
            type="button"
            onClick={() => onSelectVersion(version.id)}
            aria-pressed={version.id === activeId}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
              version.id === activeId ? "border-accent/40 bg-accent-soft" : "border-line bg-bg-elevated hover:border-line-strong",
            )}
          >
            <span className="font-mono text-[11px] font-medium text-fg-muted">v{vIndex + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{version.name}</span>
            <span className={cn("font-mono text-[10.5px] tracking-wide uppercase", version.id === activeId ? "text-accent" : "text-fg-subtle")}>
              {version.id === activeId ? "On canvas" : "Open"}
            </span>
          </button>
        )}
        {busy && m.text && m.status !== "coding" && <span className="caret inline-block h-3.5 w-px bg-accent" />}
      </div>
    </motion.div>
  );
}

function Status({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-[12.5px] text-fg-muted">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1 rounded-full bg-accent"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      {label}…
    </p>
  );
}

/** Paragraphs with `inline code` and **bold** — the only formatting replies use. */
function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-fg">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {para.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
              <code key={j} className="rounded bg-active px-1 py-px font-mono text-[11.5px]">
                {part.slice(1, -1)}
              </code>
            ) : part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
              <strong key={j} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
