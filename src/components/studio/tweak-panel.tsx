"use client";

import { RotateCcw } from "lucide-react";
import { isHexColor, type TokenObject, type TokenValue } from "@/lib/preview/tokens";

type Props = {
  defaults: TokenObject | null;
  value: TokenObject | null;
  onChange: (tokens: TokenObject) => void;
  onReset: () => void;
};

// Slider ranges inferred from token names; anything unknown gets a generic range.
function rangeFor(path: string[], current: number): { min: number; max: number; step: number; unit: string } {
  const key = path[path.length - 1].toLowerCase();
  if (key.includes("radius")) return { min: 0, max: Math.max(64, current), step: 1, unit: "px" };
  if (key.includes("duration") || key.includes("delay")) return { min: 0, max: Math.max(2, current), step: 0.01, unit: "s" };
  if (key.includes("stiffness")) return { min: 20, max: Math.max(800, current), step: 1, unit: "" };
  if (key.includes("damping")) return { min: 1, max: Math.max(60, current), step: 0.5, unit: "" };
  if (key.includes("mass")) return { min: 0.1, max: Math.max(5, current), step: 0.1, unit: "" };
  if (key.includes("scale")) return { min: 0, max: Math.max(2, current), step: 0.01, unit: "×" };
  if (current <= 1) return { min: 0, max: 1, step: 0.01, unit: "" };
  return { min: 0, max: Math.ceil(current * 3), step: current >= 10 ? 1 : 0.1, unit: "" };
}

const label = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

function setIn(obj: TokenObject, path: string[], v: TokenValue): TokenObject {
  const [head, ...rest] = path;
  return {
    ...obj,
    [head]: rest.length ? setIn((obj[head] as TokenObject) ?? {}, rest, v) : v,
  };
}

export function TweakPanel({ defaults, value, onChange, onReset }: Props) {
  if (!defaults) {
    return (
      <p className="px-5 py-6 text-[13px] leading-relaxed text-fg-subtle">
        Generate a component to tune its colors, corners and motion here — changes apply instantly, no
        regeneration needed.
      </p>
    );
  }

  const tokens = value ?? defaults;

  function renderGroup(obj: TokenObject, path: string[]): React.ReactNode {
    return Object.entries(obj).map(([key, v]) => {
      const p = [...path, key];
      const id = "tok-" + p.join("-");

      if (v && typeof v === "object") {
        return (
          <section key={id} className="border-t border-line px-5 py-4 first:border-t-0">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-fg-subtle uppercase">{label(key)}</h3>
            <div className="space-y-3">{renderGroup(v, p)}</div>
          </section>
        );
      }

      if (isHexColor(v)) {
        return (
          <label key={id} htmlFor={id} className="group flex cursor-pointer items-center justify-between gap-3">
            <span className="text-[13px] text-fg-muted group-hover:text-fg">{label(key)}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-fg-subtle uppercase">{v.slice(0, 7)}</span>
              <span className="relative size-7 overflow-hidden rounded-lg ring-1 ring-white/15">
                <span className="absolute inset-0" style={{ background: v }} />
                <input
                  id={id}
                  type="color"
                  value={v.slice(0, 7)}
                  onChange={(e) => onChange(setIn(tokens, p, e.target.value.toUpperCase() + v.slice(7)))}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </span>
            </span>
          </label>
        );
      }

      if (typeof v === "number") {
        const r = rangeFor(p, v);
        return (
          <div key={id} className={path.length === 0 ? "border-t border-line px-5 py-4 first:border-t-0" : ""}>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor={id} className="text-[13px] text-fg-muted">
                {label(key)}
              </label>
              <span className="font-mono text-[11px] text-fg-subtle tabular-nums">
                {Math.round(v * 100) / 100}
                {r.unit}
              </span>
            </div>
            <input
              id={id}
              type="range"
              min={r.min}
              max={r.max}
              step={r.step}
              value={v}
              onChange={(e) => onChange(setIn(tokens, p, Number(e.target.value)))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--accent)]"
            />
          </div>
        );
      }

      return null;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <p className="text-[12px] text-fg-subtle">Live — no regeneration</p>
        <button
          type="button"
          onClick={onReset}
          disabled={!value}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-fg-muted transition-colors hover:bg-white/5 hover:text-fg disabled:opacity-30"
        >
          <RotateCcw className="size-3" /> Reset
        </button>
      </div>
      {renderGroup(tokens, [])}
    </div>
  );
}
