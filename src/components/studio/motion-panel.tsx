"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Section, Slider } from "./design-panel";
import {
  MOTION_STATES,
  isExpr,
  isObject,
  type MotionInfo,
  type MotionLiteral,
  type MotionObject,
  type MotionProp,
  type MotionStateProp,
} from "@/lib/editor/motion-source";

type Apply = (prop: MotionProp, value: MotionLiteral | null, note: string, key?: string) => void;

type Props = {
  tag: string;
  motion: MotionInfo;
  onApply: Apply;
  onAnimate: () => void;
};

/** The properties the inspector edits directly; anything else in a state is shown read-only. */
const PROPS = [
  { key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01, unit: "", rest: 1 },
  { key: "x", label: "X", min: -200, max: 200, step: 1, unit: "px", rest: 0 },
  { key: "y", label: "Y", min: -200, max: 200, step: 1, unit: "px", rest: 0 },
  { key: "scale", label: "Scale", min: 0, max: 2, step: 0.01, unit: "×", rest: 1 },
  { key: "rotate", label: "Rotate", min: -180, max: 180, step: 1, unit: "°", rest: 0 },
] as const;

const ENTRANCES: { label: string; from: MotionObject; to: MotionObject }[] = [
  { label: "Fade", from: { opacity: 0 }, to: { opacity: 1 } },
  { label: "Fade up", from: { opacity: 0, y: 16 }, to: { opacity: 1, y: 0 } },
  { label: "Scale in", from: { opacity: 0, scale: 0.92 }, to: { opacity: 1, scale: 1 } },
  { label: "Slide in", from: { opacity: 0, x: -24 }, to: { opacity: 1, x: 0 } },
];

export const EASINGS: { name: string; curve: [number, number, number, number] }[] = [
  { name: "linear", curve: [0, 0, 1, 1] },
  { name: "easeIn", curve: [0.42, 0, 1, 1] },
  { name: "easeOut", curve: [0, 0, 0.58, 1] },
  { name: "easeInOut", curve: [0.42, 0, 0.58, 1] },
  { name: "circOut", curve: [0, 0.55, 0.45, 1] },
  { name: "backOut", curve: [0.33, 1.53, 0.69, 0.99] },
  { name: "anticipate", curve: [0.36, -0.4, 0.7, 1] },
];

const EXPO_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const SPRINGS: { label: string; stiffness: number; damping: number }[] = [
  { label: "Gentle", stiffness: 120, damping: 14 },
  { label: "Snappy", stiffness: 420, damping: 32 },
  { label: "Bouncy", stiffness: 300, damping: 10 },
  { label: "Stiff", stiffness: 700, damping: 45 },
];

const num = (v: MotionLiteral | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Edits an element's Motion props: its entrance, hover and press states, and how it moves between them. */
export function MotionPanel({ tag, motion, onApply, onAnimate }: Props) {
  const [state, setState] = useState<MotionStateProp>("animate");

  if (!motion.isMotion) {
    return (
      <Section title="Animation">
        {motion.canAnimate ? (
          <>
            <p className="mb-3 text-[12px] leading-relaxed text-fg-subtle">This &lt;{tag}&gt; doesn&apos;t animate yet.</p>
            <button
              type="button"
              onClick={onAnimate}
              className="h-8 w-full rounded-lg border border-line text-[12.5px] font-medium text-fg transition-colors hover:border-line-strong hover:bg-hover"
            >
              Make it animatable
            </button>
          </>
        ) : (
          <p className="text-[12px] leading-relaxed text-fg-subtle">
            Icons and components can&apos;t be animated directly. Select the element around it, or ask in the chat.
          </p>
        )}
      </Section>
    );
  }

  const props = motion.props;
  const transition = props.transition;

  function applyEntrance(e: (typeof ENTRANCES)[number] | null) {
    const key = "entrance-preset";
    if (!e) {
      onApply("initial", null, `Removed the entrance animation from <${tag}>`, key);
      onApply("animate", null, `Removed the entrance animation from <${tag}>`, key);
      return;
    }
    const note = `Gave <${tag}> a "${e.label}" entrance`;
    onApply("initial", e.from, note, key);
    onApply("animate", e.to, note, key);
    if (!transition) onApply("transition", { duration: 0.6, ease: EXPO_OUT }, note, key);
  }

  return (
    <>
      <Section title="Animation">
        <div className="mb-4">
          <p className="mb-2 text-[12px] text-fg-muted">Entrance</p>
          <div className="flex flex-wrap gap-1.5">
            {ENTRANCES.map((e) => (
              <Chip key={e.label} onClick={() => applyEntrance(e)}>
                {e.label}
              </Chip>
            ))}
            {(props.initial !== undefined || props.animate !== undefined) && <Chip onClick={() => applyEntrance(null)}>None</Chip>}
          </div>
        </div>

        <div role="tablist" aria-label="Animation state" className="mb-3 grid grid-cols-5 rounded-lg border border-line p-0.5">
          {MOTION_STATES.map((s) => (
            <button
              key={s.prop}
              type="button"
              role="tab"
              aria-selected={state === s.prop}
              title={s.hint}
              onClick={() => setState(s.prop)}
              className="relative h-7 rounded-md text-[11px] font-medium text-fg-subtle transition-colors hover:text-fg aria-selected:bg-active aria-selected:text-fg"
            >
              {s.label}
              {props[s.prop] !== undefined && <span className="absolute top-1 right-1 size-1 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
        <p className="mb-3 text-[11.5px] leading-snug text-fg-subtle">{MOTION_STATES.find((s) => s.prop === state)!.hint}.</p>
        <StateEditor key={state} prop={state} value={props[state]} tag={tag} onApply={onApply} />
      </Section>

      <TransitionEditor value={transition} tag={tag} onApply={onApply} />
    </>
  );
}

function Chip({ onClick, children, active }: { onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="h-7 rounded-md border border-line px-2.5 text-[11.5px] text-fg-muted transition-colors hover:border-line-strong hover:text-fg aria-pressed:border-accent/50 aria-pressed:bg-accent-soft aria-pressed:text-fg"
    >
      {children}
    </button>
  );
}

function ReadOnly({ label, source, onClear }: { label: string; source: string; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[12px] text-fg-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <code className="truncate rounded bg-active px-1.5 py-0.5 font-mono text-[10.5px] text-fg" title={source}>
          {source}
        </code>
        {onClear && <IconButton label={`Remove ${label}`} onClick={onClear} icon="minus" />}
      </span>
    </div>
  );
}

function IconButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: "plus" | "minus" }) {
  const Icon = icon === "plus" ? Plus : Minus;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-5 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:bg-hover hover:text-fg"
    >
      <Icon className="size-3" />
    </button>
  );
}

function sourceOf(v: MotionLiteral): string {
  if (isExpr(v)) return v.$expr;
  return JSON.stringify(v);
}

function StateEditor({
  prop,
  value,
  tag,
  onApply,
}: {
  prop: MotionStateProp;
  value: MotionInfo["props"][MotionStateProp];
  tag: string;
  onApply: Apply;
}) {
  const label = MOTION_STATES.find((s) => s.prop === prop)!.label;
  if (value !== undefined && !isObject(value)) {
    return (
      <ReadOnly
        label="Defined in code"
        source={typeof value === "string" ? `"${value}"` : isExpr(value) ? value.$expr : String(value)}
        onClear={() => onApply(prop, null, `Removed the ${label} state of <${tag}>`)}
      />
    );
  }
  const obj: MotionObject = value ?? {};
  const set = (key: string, v: number | null) => {
    const next: MotionObject = { ...obj };
    if (v === null) delete next[key];
    else next[key] = v;
    onApply(prop, next, v === null ? `Removed ${key} from the ${label} state of <${tag}>` : `Set ${key} to ${v} in the ${label} state of <${tag}>`, `${prop}.${key}`);
  };
  const known = new Set<string>(PROPS.map((p) => p.key));
  const extra = Object.entries(obj).filter(([k]) => !known.has(k) && k !== "transition");

  return (
    <div className="space-y-3">
      {PROPS.map((p) => {
        const v = obj[p.key];
        if (v === undefined) return null;
        const n = num(v);
        if (n === null) return <ReadOnly key={p.key} label={p.label} source={sourceOf(v)} onClear={() => set(p.key, null)} />;
        return (
          <div key={p.key} className="flex items-end gap-1.5">
            <div className="min-w-0 flex-1">
              <Slider
                label={p.label}
                value={n}
                min={Math.min(p.min, n)}
                max={Math.max(p.max, n)}
                step={p.step}
                unit={p.unit}
                onChange={(x) => set(p.key, x)}
              />
            </div>
            <IconButton label={`Remove ${p.label}`} onClick={() => set(p.key, null)} icon="minus" />
          </div>
        );
      })}
      {extra.map(([k, v]) => (
        <ReadOnly key={k} label={k} source={sourceOf(v)} onClear={() => set(k, null)} />
      ))}
      {PROPS.some((p) => obj[p.key] === undefined) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-fg-subtle">Add</span>
          {PROPS.filter((p) => obj[p.key] === undefined).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => set(p.key, prop === "initial" && p.key === "opacity" ? 0 : p.rest)}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-line-strong px-2 text-[11px] text-fg-muted transition-colors hover:border-accent/60 hover:text-fg"
            >
              <Plus className="size-3" /> {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type TransitionKind = "tween" | "spring";

function kindOf(t: MotionObject): TransitionKind {
  if (t.type === "spring" || "stiffness" in t || "damping" in t || "bounce" in t) return "spring";
  return "tween";
}

function TransitionEditor({ value, tag, onApply }: { value: MotionInfo["props"]["transition"]; tag: string; onApply: Apply }) {
  if (value !== undefined && !isObject(value)) {
    return (
      <Section title="Transition">
        <ReadOnly
          label="Defined in code"
          source={isExpr(value) ? value.$expr : String(value)}
          onClear={() => onApply("transition", null, `Removed the transition of <${tag}>`)}
        />
      </Section>
    );
  }
  const t: MotionObject = value ?? {};
  const kind = kindOf(t);
  const write = (next: MotionObject, note: string, key: string) => onApply("transition", next, note, key);
  const setField = (k: string, v: MotionLiteral | null, key = `transition.${k}`) => {
    const next = { ...t };
    if (v === null) delete next[k];
    else next[k] = v;
    write(next, v === null ? `Removed ${k} from the transition of <${tag}>` : `Set the ${k} of <${tag}>'s transition`, key);
  };

  function setKind(k: TransitionKind) {
    if (k === kind) return;
    const { delay, repeat, repeatType } = t;
    const keep: MotionObject = {};
    if (delay !== undefined) keep.delay = delay;
    if (repeat !== undefined) keep.repeat = repeat;
    if (repeatType !== undefined) keep.repeatType = repeatType;
    const next: MotionObject =
      k === "spring" ? { type: "spring", stiffness: 300, damping: 24, ...keep } : { duration: 0.6, ease: EXPO_OUT, ...keep };
    write(next, `Switched <${tag}>'s transition to a ${k}`, "transition.kind");
  }

  const repeat = t.repeat === undefined ? "off" : t.repeatType === "mirror" || t.repeatType === "reverse" ? "mirror" : "loop";

  return (
    <Section title="Transition">
      <div role="radiogroup" aria-label="Transition type" className="mb-4 grid grid-cols-2 rounded-lg border border-line p-0.5">
        {(["tween", "spring"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className="h-7 rounded-md text-[11.5px] font-medium text-fg-subtle capitalize transition-colors hover:text-fg aria-checked:bg-active aria-checked:text-fg"
          >
            {k === "tween" ? "Ease" : "Spring"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {kind === "tween" ? (
          <>
            <NumberField t={t} k="duration" label="Duration" min={0} max={3} step={0.05} unit="s" fallback={0.3} setField={setField} />
            <EasingEditor value={t.ease} onChange={(e, key) => setField("ease", e, key)} />
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {SPRINGS.map((s) => (
                <Chip
                  key={s.label}
                  active={t.stiffness === s.stiffness && t.damping === s.damping}
                  onClick={() => write({ ...t, type: "spring", stiffness: s.stiffness, damping: s.damping }, `Gave <${tag}> a ${s.label.toLowerCase()} spring`, "transition.spring-preset")}
                >
                  {s.label}
                </Chip>
              ))}
            </div>
            <SpringCurve stiffness={num(t.stiffness) ?? 100} damping={num(t.damping) ?? 10} mass={num(t.mass) ?? 1} />
            <NumberField t={t} k="stiffness" label="Stiffness" min={10} max={1000} step={5} unit="" fallback={100} setField={setField} />
            <NumberField t={t} k="damping" label="Damping" min={1} max={100} step={0.5} unit="" fallback={10} setField={setField} />
            <NumberField t={t} k="mass" label="Mass" min={0.1} max={5} step={0.1} unit="" fallback={1} setField={setField} />
          </>
        )}
        <NumberField t={t} k="delay" label="Delay" min={0} max={2} step={0.05} unit="s" fallback={0} setField={setField} />

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[13px] text-fg-muted">Repeat</span>
          <div role="radiogroup" aria-label="Repeat" className="flex rounded-lg border border-line p-0.5">
            {(["off", "loop", "mirror"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={repeat === r}
                onClick={() => {
                  const next = { ...t };
                  delete next.repeat;
                  delete next.repeatType;
                  if (r !== "off") {
                    next.repeat = Infinity;
                    next.repeatType = r === "mirror" ? "mirror" : "loop";
                  }
                  write(next, r === "off" ? `Stopped <${tag}> repeating` : `Made <${tag}> repeat (${r})`, "transition.repeat");
                }}
                className="h-6 rounded-md px-2 text-[11px] text-fg-subtle capitalize transition-colors hover:text-fg aria-checked:bg-active aria-checked:text-fg"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/** A transition number: a slider when it's a literal, the expression (e.g. a token) when it isn't. */
function NumberField({
  t,
  k,
  label,
  min,
  max,
  step,
  unit,
  fallback,
  setField,
}: {
  t: MotionObject;
  k: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  fallback: number;
  setField: (k: string, v: MotionLiteral | null) => void;
}) {
  const v = t[k];
  if (v !== undefined && num(v) === null) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-fg-muted">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <code className="truncate rounded bg-active px-1.5 py-0.5 font-mono text-[10.5px] text-fg">{sourceOf(v)}</code>
          <button
            type="button"
            onClick={() => setField(k, fallback)}
            title="Replace with a value you can drag"
            className="shrink-0 text-[11px] text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
          >
            Detach
          </button>
        </span>
      </div>
    );
  }
  const n = num(v) ?? fallback;
  return (
    <Slider
      label={label}
      value={n}
      min={Math.min(min, n)}
      max={Math.max(max, n)}
      step={step}
      unit={unit}
      onChange={(x) => setField(k, x)}
      onReset={v !== undefined ? () => setField(k, null) : undefined}
    />
  );
}

function curveOf(ease: MotionLiteral | undefined): [number, number, number, number] | null {
  if (Array.isArray(ease) && ease.length === 4 && ease.every((x) => typeof x === "number")) return ease as [number, number, number, number];
  if (typeof ease === "string") return EASINGS.find((e) => e.name === ease)?.curve ?? null;
  return ease === undefined ? EASINGS.find((e) => e.name === "easeOut")!.curve : null;
}

/** Cubic-bezier editor: drag the two handles, or pick a named curve. */
function EasingEditor({ value, onChange }: { value: MotionLiteral | undefined; onChange: (v: MotionLiteral, key: string) => void }) {
  const curve = curveOf(value);
  const svg = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<0 | 1 | null>(null);
  const W = 220;
  const H = 120;
  const PAD = 14;
  const Y0 = -0.5;
  const Y1 = 1.5;
  const sx = (x: number) => PAD + x * (W - 2 * PAD);
  const sy = (y: number) => PAD + (1 - (y - Y0) / (Y1 - Y0)) * (H - 2 * PAD);
  const named = typeof value === "string" ? value : value === undefined ? "easeOut" : null;

  function move(e: React.PointerEvent) {
    if (dragging === null || !curve) return;
    const r = svg.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width) * (W / (W - 2 * PAD)) - PAD / (W - 2 * PAD)));
    const yRatio = ((e.clientY - r.top) / r.height) * (H / (H - 2 * PAD)) - PAD / (H - 2 * PAD);
    const y = Math.max(Y0, Math.min(Y1, Y1 - yRatio * (Y1 - Y0)));
    const next: [number, number, number, number] = [...curve];
    next[dragging * 2] = Math.round(x * 100) / 100;
    next[dragging * 2 + 1] = Math.round(y * 100) / 100;
    onChange(next, "transition.ease.curve");
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] text-fg-muted">Easing</span>
        <select
          aria-label="Easing preset"
          value={named ?? (curve ? "custom" : "code")}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "expo") onChange(EXPO_OUT, "transition.ease.preset");
            else if (v !== "custom" && v !== "code") onChange(v, "transition.ease.preset");
          }}
          className="h-7 rounded-md border border-line bg-bg px-1.5 text-[11.5px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {!curve && <option value="code">From code</option>}
          {curve && !named && <option value="custom">Custom curve</option>}
          <option value="expo">Expo out</option>
          {EASINGS.map((e) => (
            <option key={e.name} value={e.name}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      {curve ? (
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="dot-grid w-full touch-none rounded-lg border border-line bg-bg-sunken"
          onPointerMove={move}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
          role="img"
          aria-label={`Easing curve ${curve.join(", ")}`}
        >
          <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="var(--line-strong)" strokeDasharray="3 3" />
          <line x1={sx(0)} y1={sy(0)} x2={sx(curve[0])} y2={sy(curve[1])} stroke="var(--fg-subtle)" />
          <line x1={sx(1)} y1={sy(1)} x2={sx(curve[2])} y2={sy(curve[3])} stroke="var(--fg-subtle)" />
          <path
            d={`M${sx(0)},${sy(0)} C${sx(curve[0])},${sy(curve[1])} ${sx(curve[2])},${sy(curve[3])} ${sx(1)},${sy(1)}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
          />
          {[0, 1].map((i) => (
            <circle
              key={i}
              cx={sx(curve[i * 2])}
              cy={sy(curve[i * 2 + 1])}
              r={dragging === i ? 7 : 5.5}
              fill="var(--bg-elevated)"
              stroke="var(--accent)"
              strokeWidth={2}
              className="cursor-grab"
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setDragging(i as 0 | 1);
              }}
            />
          ))}
        </svg>
      ) : (
        <code className="block rounded bg-active px-2 py-1 font-mono text-[10.5px] text-fg">{value ? sourceOf(value) : ""}</code>
      )}
      {curve && <p className="mt-1 font-mono text-[10px] text-fg-subtle">[{curve.join(", ")}]</p>}
    </div>
  );
}

/** Plots the spring's travel from 0 to 1 over its settle time. */
function SpringCurve({ stiffness, damping, mass }: { stiffness: number; damping: number; mass: number }) {
  const W = 220;
  const H = 70;
  const samples: number[] = [];
  let x = 0;
  let v = 0;
  const dt = 1 / 240;
  let settledAt = 2;
  for (let i = 0; i < 480; i++) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    if (i % 4 === 0) samples.push(x);
    if (Math.abs(x - 1) > 0.005 || Math.abs(v) > 0.05) settledAt = (i + 1) * dt;
  }
  const max = Math.max(1.2, ...samples);
  const pts = samples.map((s, i) => `${(i / (samples.length - 1)) * W},${H - 6 - (s / max) * (H - 12)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-line bg-bg-sunken" role="img" aria-label="Spring response">
        <line x1={0} x2={W} y1={H - 6 - (1 / max) * (H - 12)} y2={H - 6 - (1 / max) * (H - 12)} stroke="var(--line-strong)" strokeDasharray="3 3" />
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2} />
      </svg>
      <p className="mt-1 font-mono text-[10px] text-fg-subtle">settles in ~{settledAt >= 2 ? "2s+" : settledAt.toFixed(2) + "s"}</p>
    </div>
  );
}
