"use client";

import { useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { TimelineAction, TimelineState } from "./preview-frame";
import { cn } from "@/lib/cn";

const RATES = [0.25, 0.5, 1];

const fmt = (ms: number) => (ms / 1000).toFixed(2) + "s";

/** Play, pause and scrub the canvas's animation clock — edit the design at any moment of it. */
export function TimelineBar({
  state,
  interactive,
  onAction,
}: {
  state: TimelineState | null;
  /** The canvas is in interactive mode, where time runs live. */
  interactive: boolean;
  onAction: (action: TimelineAction) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  // The last position asked for: key repeats build on it before the canvas reports back.
  const requested = useRef<{ t: number; at: number } | null>(null);
  const duration = state?.duration ?? 0;
  const live = interactive && state?.playing && !state.loops && state.t > duration;
  const t = drag ?? Math.min(state?.t ?? 0, duration);
  const pct = duration ? (t / duration) * 100 : 0;
  const disabled = !state || duration === 0;

  function at(clientX: number) {
    const r = track.current!.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * duration);
  }

  function seek(next: number) {
    setDrag(next);
    onAction({ action: "seek", t: next });
  }

  const ticks = duration ? Math.min(Math.floor(duration / 100), 120) : 0;

  return (
    <div className="flex h-11 items-center gap-2 border-t border-line px-2.5">
      <button
        type="button"
        disabled={!state}
        onClick={() => onAction(state?.playing ? { action: "pause" } : { action: "play" })}
        aria-label={state?.playing ? "Pause animation" : "Play animation"}
        title={state?.playing ? "Pause" : "Play"}
        className="grid size-7 place-items-center rounded-md bg-fg text-bg transition-opacity hover:opacity-85 disabled:opacity-30"
      >
        {state?.playing ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 translate-x-px fill-current" />}
      </button>
      <button
        type="button"
        disabled={!state}
        onClick={() => {
          onAction({ action: "seek", t: 0 });
          onAction({ action: "play" });
        }}
        aria-label="Replay from the start"
        title="Replay from the start"
        className="grid size-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-30"
      >
        <RotateCcw className="size-3.5" />
      </button>

      <span className="w-12 shrink-0 text-right font-mono text-[11px] text-fg tabular-nums">{live ? "live" : fmt(t)}</span>

      <div
        ref={track}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Animation position"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(t)}
        aria-valuetext={fmt(t)}
        aria-disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          seek(at(e.clientX));
        }}
        onPointerMove={(e) => {
          if (drag !== null) seek(at(e.clientX));
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => {
          if (disabled) return;
          const step = e.shiftKey ? 250 : 50;
          const r = requested.current;
          const from = r && e.timeStamp - r.at < 500 ? r.t : t;
          const next =
            e.key === "ArrowLeft" || e.key === "ArrowDown"
              ? from - step
              : e.key === "ArrowRight" || e.key === "ArrowUp"
                ? from + step
                : e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? duration
                    : null;
          if (next === null) return;
          e.preventDefault();
          const target = Math.max(0, Math.min(duration, next));
          requested.current = { t: target, at: e.timeStamp };
          onAction({ action: "seek", t: target });
        }}
        className={cn(
          "group relative h-7 min-w-0 flex-1 touch-none outline-none select-none",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-ew-resize",
        )}
      >
        {/* Ruler: a tick every 100ms, taller every 500ms. */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <span
            key={i}
            className={cn("absolute top-1/2 w-px -translate-y-1/2 bg-line-strong", i % 5 === 0 ? "h-3" : "h-1.5")}
            style={{ left: `${((i * 100) / duration) * 100}%` }}
          />
        ))}
        <div className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
        <span
          className="absolute top-1/2 h-4 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border-[1.5px] border-accent bg-bg-elevated shadow-sm transition-transform group-focus-visible:scale-125"
          style={{ left: `${pct}%` }}
        />
      </div>

      <span className="w-20 shrink-0 font-mono text-[11px] text-fg-subtle tabular-nums">
        {disabled ? "no entrance" : state?.loops ? `${fmt(duration)} loop` : fmt(duration)}
      </span>

      <div className="hidden items-center rounded-md border border-line p-0.5 sm:flex" role="group" aria-label="Playback speed">
        {RATES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={state?.rate === r}
            onClick={() => onAction({ action: "rate", rate: r })}
            className="h-6 rounded px-1.5 font-mono text-[10.5px] text-fg-subtle transition-colors hover:text-fg aria-pressed:bg-active aria-pressed:text-fg"
          >
            {r}×
          </button>
        ))}
      </div>
    </div>
  );
}
