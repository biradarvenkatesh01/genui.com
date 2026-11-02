"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractName, parseReply } from "./parse";
import type { CanvasContext, ConversationTurn, GenerateEvent, GenerateRequest } from "./types";

export type Version = {
  id: string;
  prompt: string;
  category: string;
  code: string;
  name: string;
  createdAt: number;
};

export type UserMessage = {
  id: string;
  role: "user";
  text: string;
  /** Tag of the canvas element the message was aimed at. */
  target?: string;
};

export type AssistantMessage = {
  id: string;
  role: "assistant";
  text: string;
  status: "thinking" | "replying" | "coding" | "done" | "stopped" | "error";
  /** Lines of code streamed so far, while coding. */
  lines?: number;
  /** The version this reply produced. */
  versionId?: string;
  error?: string;
};

export type ChatMessage = UserMessage | AssistantMessage;

export type GenerationStatus = "idle" | "streaming";

export type SendOptions = {
  category: string;
  theme: "light" | "dark";
  /** The component on the canvas, exactly as the user sees it. Omit to start fresh. */
  canvas?: CanvasContext;
};

const id = () => crypto.randomUUID();

/** The thread as plain-text turns for the model: replies note which version they produced. */
function toTurns(messages: ChatMessage[], versions: Version[]): ConversationTurn[] {
  return messages.flatMap((m): ConversationTurn[] => {
    if (m.role === "user") return [{ role: "user", text: m.target ? `[About the selected <${m.target}>] ${m.text}` : m.text }];
    if (m.status === "error" || !m.text) return [];
    const v = m.versionId ? versions.findIndex((x) => x.id === m.versionId) : -1;
    const note = v >= 0 ? ` [Produced v${v + 1}: ${versions[v].name}]` : "";
    return [{ role: "assistant", text: m.text + note }];
  });
}

export function useGeneration() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [streamingCode, setStreamingCode] = useState("");
  const [demo, setDemo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // The latest thread for building requests, without waiting for a re-render.
  const state = useRef({ messages, versions });
  useEffect(() => {
    state.current = { messages, versions };
  }, [messages, versions]);

  const active = versions.find((v) => v.id === activeId) ?? null;

  const patchReply = useCallback((replyId: string, patch: Partial<AssistantMessage>) => {
    setMessages((ms) => ms.map((m) => (m.id === replyId && m.role === "assistant" ? { ...m, ...patch } : m)));
  }, []);

  const send = useCallback(
    async (prompt: string, opts: SendOptions & { target?: string }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const conversation = toTurns(state.current.messages, state.current.versions);
      const replyId = id();
      setMessages((ms) => [
        ...ms,
        { id: id(), role: "user", text: prompt, target: opts.target },
        { id: replyId, role: "assistant", text: "", status: "thinking" },
      ]);
      setStatus("streaming");
      setStreamingCode("");

      let raw = "";
      let failed: string | null = null;
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            category: opts.category,
            theme: opts.theme,
            conversation,
            canvas: opts.canvas,
          } satisfies GenerateRequest),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
        setDemo(res.headers.get("X-GenUI-Mode") === "demo");

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const l of lines) {
            if (!l.trim()) continue;
            const event = JSON.parse(l) as GenerateEvent;
            if (event.type === "delta") {
              raw += event.text;
              const parsed = parseReply(raw);
              setStreamingCode(parsed.code);
              patchReply(replyId, {
                text: parsed.message,
                status: parsed.hasCode ? "coding" : parsed.message ? "replying" : "thinking",
                lines: parsed.code ? parsed.code.split("\n").length : undefined,
              });
            } else if (event.type === "error") {
              failed = event.message;
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          const { message } = parseReply(raw);
          patchReply(replyId, { text: message, status: "stopped" });
          return;
        }
        failed = err instanceof Error ? err.message : "Generation failed";
      } finally {
        if (abortRef.current === controller) {
          setStatus("idle");
          setStreamingCode("");
        }
      }

      const parsed = parseReply(raw);
      if (!failed && parsed.hasCode && !parsed.complete) failed = "The component got cut off before it finished. Try again or ask for something simpler.";
      if (!failed && !parsed.hasCode && !parsed.message) failed = "The model didn't reply. Try rephrasing your message.";
      if (failed) {
        patchReply(replyId, { text: parsed.message, status: "error", error: failed });
        return;
      }

      if (!parsed.hasCode) {
        // A text-only answer: the canvas keeps the current component.
        patchReply(replyId, { text: parsed.message, status: "done" });
        return;
      }

      const version: Version = {
        id: id(),
        prompt,
        category: opts.category,
        code: parsed.code,
        name: extractName(parsed.code),
        createdAt: Date.now(),
      };
      setVersions((vs) => [...vs, version]);
      setActiveId(version.id);
      patchReply(replyId, {
        text: parsed.message || `Updated ${version.name}.`,
        status: "done",
        versionId: version.id,
        lines: undefined,
      });
    },
    [patchReply],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const updateActiveCode = useCallback(
    (code: string) => {
      if (!activeId) return;
      setVersions((vs) => vs.map((v) => (v.id === activeId ? { ...v, code } : v)));
    },
    [activeId],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setVersions([]);
    setMessages([]);
    setActiveId(null);
    setStatus("idle");
    setStreamingCode("");
  }, []);

  return {
    reset,
    versions,
    messages,
    active,
    activeId,
    setActiveId,
    status,
    streamingCode,
    demo,
    send,
    stop,
    updateActiveCode,
  };
}
