"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from "react";
import { compileComponent } from "@/lib/preview/compile";
import { PREVIEW_HTML } from "@/lib/preview/runtime";
import type { TokenObject } from "@/lib/preview/tokens";

export type Canvas = "dark" | "light";

/** What the preview reports about the element selected on the canvas. */
export type Selection = {
  gid: number;
  ancestors: { gid: number; tag: string }[];
  instances: number;
  computed: {
    color: string;
    backgroundColor: string;
    fontSize: number;
    fontWeight: number;
    textAlign: string;
    borderRadius: number;
    padding: number;
    opacity: number;
    width: number;
    height: number;
    translate: [number, number];
  };
};

export type CanvasEdit =
  | { op: "style"; gid: number; style: Record<string, string | number> }
  | { op: "text"; gid: number; text: string };

export type CanvasKey = { key: string; mod: boolean; shift: boolean };

/** The preview's animation clock, as reported by the runtime. */
export type TimelineState = {
  /** Position in ms since the component mounted. */
  t: number;
  /** When the entrance animation settles (ms); 0 when nothing animates on mount. */
  duration: number;
  /** Something repeats forever; `duration` is then a window to scrub through. */
  loops: boolean;
  playing: boolean;
  rate: number;
};

export type TimelineAction = { action: "play" } | { action: "pause" } | { action: "seek"; t: number } | { action: "rate"; rate: number };

export type PreviewHandle = {
  /** Applies styles to the DOM right away, ahead of the source edit that makes them stick. */
  previewStyle: (gid: number, style: Record<string, string>) => void;
  timeline: (action: TimelineAction) => void;
};

type Props = {
  code: string | null;
  tokens: TokenObject | null;
  canvas: Canvas;
  replayKey: number;
  editing: boolean;
  selected: { gid: number; label: string } | null;
  onDefaultTokens: (tokens: TokenObject | null) => void;
  onError: (message: string | null) => void;
  onSelect: (selection: Selection | null) => void;
  onEdit: (edit: CanvasEdit) => void;
  onKey: (key: CanvasKey) => void;
  onTextRequest: (gid: number) => void;
  onTimeline: (state: TimelineState) => void;
  ref?: Ref<PreviewHandle>;
};

type RawSelection = Omit<Selection, "gid" | "ancestors"> & { gid: string; ancestors: { gid: string; tag: string }[] };

type PreviewMessage = { source: "genui-preview" } & (
  | { type: "ready" }
  | { type: "rendered"; tokens: TokenObject | null }
  | { type: "error"; message: string }
  | ({ type: "select" } & (RawSelection | { gid: null }))
  | { type: "edit"; op: "style"; gid: string; style: Record<string, string | number> }
  | { type: "edit"; op: "text"; gid: string; text: string }
  | ({ type: "key" } & CanvasKey)
  | { type: "text-request"; gid: string }
  | ({ type: "timeline" } & TimelineState)
);

/**
 * Renders a component inside a sandboxed iframe (scripts only, opaque origin),
 * so generated code can't reach the app's cookies, storage or DOM.
 */
export function PreviewFrame({
  code,
  tokens,
  canvas,
  replayKey,
  editing,
  selected,
  onDefaultTokens,
  onError,
  onSelect,
  onEdit,
  onKey,
  onTextRequest,
  onTimeline,
  ref,
}: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Bumped on every "ready": if the iframe document reloads, everything is re-sent.
  const [loads, setLoads] = useState(0);
  const handle = useEffectEvent((msg: PreviewMessage) => {
    switch (msg.type) {
      case "ready":
        setLoads((n) => n + 1);
        break;
      case "rendered":
        onError(null);
        onDefaultTokens(msg.tokens);
        break;
      case "error":
        onError(msg.message);
        break;
      case "select":
        onSelect(
          msg.gid === null
            ? null
            : { ...msg, gid: Number(msg.gid), ancestors: msg.ancestors.map((a) => ({ ...a, gid: Number(a.gid) })) },
        );
        break;
      case "edit":
        onEdit(msg.op === "text" ? { op: "text", gid: Number(msg.gid), text: msg.text } : { op: "style", gid: Number(msg.gid), style: msg.style });
        break;
      case "key":
        onKey({ key: msg.key, mod: msg.mod, shift: msg.shift });
        break;
      case "text-request":
        onTextRequest(Number(msg.gid));
        break;
      case "timeline":
        onTimeline({ t: msg.t, duration: msg.duration, loops: msg.loops, playing: msg.playing, rate: msg.rate });
        break;
    }
  });
  const reportError = useEffectEvent((m: string) => onError(m));
  const currentTokens = useEffectEvent(() => tokens);

  const send = (msg: object) =>
    frame.current?.contentWindow?.postMessage({ source: "genui-host", ...msg }, "*");

  useImperativeHandle(ref, () => ({
    previewStyle: (gid, style) => send({ type: "preview-style", gid: String(gid), style }),
    timeline: (action) => send({ type: "timeline", ...action }),
  }));

  useEffect(() => {
    function onMessage(e: MessageEvent<PreviewMessage>) {
      if (e.source !== frame.current?.contentWindow || e.data?.source !== "genui-preview") return;
      handle(e.data);
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

  useEffect(() => {
    if (loads) send({ type: "mode", edit: editing });
  }, [loads, editing]);

  const selectedGid = selected?.gid ?? null;
  const selectedLabel = selected?.label ?? "";
  useEffect(() => {
    if (loads) send({ type: "select", gid: selectedGid === null ? null : String(selectedGid), label: selectedLabel });
  }, [loads, selectedGid, selectedLabel]);

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
