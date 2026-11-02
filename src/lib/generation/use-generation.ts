"use client";

import { useCallback, useRef, useState } from "react";
import { extractCode, extractName } from "./parse";
import type { GenerateEvent, GenerateRequest, SelectedElement } from "./types";

/** What a refinement builds on. Without `baseCode` the prompt starts a new component. */
export type RefineContext = {
  baseCode?: string;
  history?: string[];
  manualEdits?: string[];
  selection?: SelectedElement;
};

export type Version = {
  id: string;
  prompt: string;
  category: string;
  code: string;
  name: string;
  createdAt: number;
};

export type GenerationStatus = "idle" | "streaming" | "error";

export function useGeneration() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [streamingCode, setStreamingCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const active = versions.find((v) => v.id === activeId) ?? null;

  const generate = useCallback(
    async (prompt: string, category: string, opts: RefineContext = {}) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("streaming");
      setStreamingCode("");
      setError(null);

      let raw = "";
      let failed: string | null = null;
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            category,
            ...(opts.baseCode && {
              previousCode: opts.baseCode,
              history: opts.history,
              manualEdits: opts.manualEdits,
              selection: opts.selection,
            }),
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
              setStreamingCode(extractCode(raw).code);
            } else if (event.type === "error") {
              failed = event.message;
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        failed = err instanceof Error ? err.message : "Generation failed";
      }

      const { code, complete } = extractCode(raw);
      if (!failed && !complete) failed = "The model didn't return a component. Try rephrasing your prompt.";
      if (failed) {
        setStatus("error");
        setError(failed);
        return;
      }

      const version: Version = {
        id: crypto.randomUUID(),
        prompt,
        category,
        code,
        name: extractName(code),
        createdAt: Date.now(),
      };
      setVersions((vs) => [...vs, version]);
      setActiveId(version.id);
      setStreamingCode("");
      setStatus("idle");
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setStreamingCode("");
  }, []);

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
    setActiveId(null);
    setStatus("idle");
    setStreamingCode("");
    setError(null);
  }, []);

  return {
    reset,
    versions,
    active,
    activeId,
    setActiveId,
    status,
    streamingCode,
    error,
    demo,
    generate,
    stop,
    updateActiveCode,
  };
}
