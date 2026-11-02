"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { compileComponent } from "@/lib/preview/compile";
import { PREVIEW_HTML } from "@/lib/preview/runtime";
import type { TokenObject } from "@/lib/preview/tokens";

export type Canvas = "dark" | "light";

type Props = {
  code: string | null;
  tokens: TokenObject | null;
  canvas: Canvas;
  replayKey: number;
  onDefaultTokens: (tokens: TokenObject | null) => void;
  onError: (message: string | null) => void;
};

type PreviewMessage =
  | { source: "genui-preview"; type: "ready" }
  | { source: "genui-preview"; type: "rendered"; tokens: TokenObject | null }
  | { source: "genui-preview"; type: "error"; message: string };

/**
 * Renders a component inside a sandboxed iframe (scripts only, opaque origin),
 * so generated code can't reach the app's cookies, storage or DOM.
 */
export function PreviewFrame({ code, tokens, canvas, replayKey, onDefaultTokens, onError }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Bumped on every "ready": if the iframe document reloads, everything is re-sent.
  const [loads, setLoads] = useState(0);
  const reportTokens = useEffectEvent((t: TokenObject | null) => onDefaultTokens(t));
  const reportError = useEffectEvent((m: string | null) => onError(m));
  const currentTokens = useEffectEvent(() => tokens);

  const send = (msg: object) =>
    frame.current?.contentWindow?.postMessage({ source: "genui-host", ...msg }, "*");

  useEffect(() => {
    function onMessage(e: MessageEvent<PreviewMessage>) {
      if (e.source !== frame.current?.contentWindow || e.data?.source !== "genui-preview") return;
      const msg = e.data;
      if (msg.type === "ready") setLoads((n) => n + 1);
      if (msg.type === "rendered") {
        reportError(null);
        reportTokens(msg.tokens);
      }
      if (msg.type === "error") reportError(msg.message);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!loads || !code) return;
    const result = compileComponent(code);
    if (result.ok) send({ type: "render", js: result.js, tokens: currentTokens() });
    else reportError(result.error);
  }, [loads, code]);

  useEffect(() => {
    if (loads) send({ type: "tokens", tokens });
  }, [loads, tokens]);

  useEffect(() => {
    if (loads) send({ type: "theme", canvas });
  }, [loads, canvas]);

  useEffect(() => {
    if (loads && replayKey) send({ type: "replay" });
  }, [loads, replayKey]);

  return (
    <iframe
      ref={frame}
      title="Component preview"
      sandbox="allow-scripts"
      srcDoc={PREVIEW_HTML}
      className="size-full border-0 bg-transparent"
    />
  );
}
