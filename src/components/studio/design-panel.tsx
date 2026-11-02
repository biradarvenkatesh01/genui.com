"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ChevronRight, CopyPlus, RotateCcw, Trash2 } from "lucide-react";
import type { ElementInfo, StylePatch, StyleValue } from "@/lib/editor/jsx-source";
import type { Selection } from "./preview-frame";
import { cn } from "@/lib/cn";

type Props = {
  info: ElementInfo;
  computed: Selection | null;
  tokenColors: Record<string, string>;
  /** Bumped when the canvas asks to edit text that can't be typed in place. */
  focusTextKey: number;
  onStyle: (patch: StylePatch, preview: Record<string, string>, debounce: boolean) => void;
  onText: (text: string) => void;
  onSelect: (gid: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: "before" | "after") => void;
};

const WEIGHTS = [300, 400, 500, 600, 700, 800];
const ALIGNS = [
  { id: "left", icon: AlignLeft },
  { id: "center", icon: AlignCenter },
  { id: "right", icon: AlignRight },
] as const;

function toHex(css: string): string | null {
  const m = css.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
  if (!m || (m[4] !== undefined && Number(m[4]) === 0)) return null;
  return "#" + [m[1], m[2], m[3]].map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** "t.colors.accent" → "accent" */
function tokenName(v: StyleValue | undefined): string | null {
  return v?.kind === "expr" ? (v.source.match(/^(?:t|tokens)\.colors\.(\w+)$/)?.[1] ?? null) : null;
}

const literal = (v: StyleValue | undefined) => (v?.kind === "literal" ? v.value : undefined);

export function DesignPanel({
  info,
  computed,
  tokenColors,
  focusTextKey,
  onStyle,
  onText,
  onSelect,
  onDelete,
  onDuplicate,
  onMove,
}: Props) {
  const c = computed?.computed;
  const style = info.style ?? {};
  const has = (key: string) => key in style;
  const num = (key: string, fallback: number) => {
    const v = literal(style[key]);
    return typeof v === "number" ? v : typeof v === "string" && /^-?[\d.]+px$/.test(v) ? parseFloat(v) : fallback;
  };
  const [tx, ty] = c?.translate ?? [0, 0];

  const setNum = (key: string, value: number, debounce = true) =>
    onStyle({ [key]: value }, { [key]: key === "opacity" || key === "fontWeight" ? String(value) : value + "px" }, debounce);
  const reset = (...keys: string[]) =>
    onStyle(Object.fromEntries(keys.map((k) => [k, null])), Object.fromEntries(keys.map((k) => [k, ""])), false);
  const setColor = (key: string, value: string | { token: string }) =>
    typeof value === "string"
      ? onStyle({ [key]: value }, { [key]: value }, true)
      : onStyle({ [key]: { expr: `${info.tokenVar}.colors.${value.token}` } }, { [key]: tokenColors[value.token] }, false);
  const setOffset = (x: number, y: number) => {
    const v = `${Math.round(x)}px ${Math.round(y)}px`;
    onStyle({ translate: v }, { translate: v }, true);
  };

  return (
    <div className="pb-6">
      <div className="border-b border-line px-5 py-3">
        <nav aria-label="Element path" className="flex flex-wrap items-center gap-0.5 text-[11px] text-fg-subtle">
          {computed?.ancestors.slice(-3).map((a) => (
            <span key={a.gid} className="flex items-center gap-0.5">
              <button type="button" onClick={() => onSelect(a.gid)} className="rounded px-1 py-0.5 hover:bg-white/5 hover:text-fg">
                {a.tag}
              </button>
              <ChevronRight className="size-3" />
            </span>
          ))}
          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-medium text-accent">{info.tag}</span>
        </nav>
        {computed && computed.instances > 1 && (
          <p className="mt-2 text-[11px] leading-snug text-fg-subtle">
            Repeated {computed.instances}× — changes apply to every copy.
          </p>
        )}
        <div className="mt-3 flex gap-1">
          <Action label="Move earlier" disabled={!info.canMove.before} onClick={() => onMove("before")}>
            <ArrowUp className="size-3.5" />
          </Action>
          <Action label="Move later" disabled={!info.canMove.after} onClick={() => onMove("after")}>
            <ArrowDown className="size-3.5" />
          </Action>
          <Action label="Duplicate (Ctrl+D)" disabled={!info.canDuplicate} onClick={onDuplicate}>
            <CopyPlus className="size-3.5" />
          </Action>
          <Action label="Delete (Del)" disabled={!info.canDelete} onClick={onDelete} danger>
            <Trash2 className="size-3.5" />
          </Action>
        </div>
      </div>

      {info.text !== null && (
        <Section title="Text">
          <TextField key={info.snippet} value={info.text} focusKey={focusTextKey} onCommit={onText} />
        </Section>
      )}

      <Section title="Layout">
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="X" value={tx} onChange={(x) => setOffset(x, ty)} />
          <NumberInput label="Y" value={ty} onChange={(y) => setOffset(tx, y)} />
          <NumberInput label="W" value={num("width", c?.width ?? 0)} min={0} onChange={(v) => setNum("width", v)} />
          <NumberInput label="H" value={num("height", c?.height ?? 0)} min={0} onChange={(v) => setNum("height", v)} />
        </div>
        <div className="mt-2 flex gap-1">
          <ResetChip show={has("translate")} onClick={() => reset("translate")}>Position</ResetChip>
          <ResetChip show={has("width") || has("height")} onClick={() => reset("width", "height")}>Size</ResetChip>
        </div>
      </Section>

      <Section title="Typography">
        <Slider
          label="Size"
          value={num("fontSize", c?.fontSize ?? 16)}
          min={8}
          max={96}
          unit="px"
          onChange={(v) => setNum("fontSize", v)}
          onReset={has("fontSize") ? () => reset("fontSize") : undefined}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <select
            aria-label="Font weight"
            value={Number(literal(style.fontWeight) ?? c?.fontWeight ?? 400)}
            onChange={(e) => setNum("fontWeight", Number(e.target.value), false)}
            className="h-8 flex-1 rounded-lg border border-line bg-bg px-2 text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {WEIGHTS.map((w) => (
              <option key={w} value={w}>
                Weight {w}
              </option>
            ))}
          </select>
          <div role="radiogroup" aria-label="Text alignment" className="flex rounded-lg border border-line p-0.5">
            {ALIGNS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={(literal(style.textAlign) ?? c?.textAlign) === id}
                aria-label={`Align ${id}`}
                onClick={() => onStyle({ textAlign: id }, { textAlign: id }, false)}
                className="grid size-7 place-items-center rounded-md text-fg-subtle aria-checked:bg-white/10 aria-checked:text-fg"
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
        <ColorField
          label="Color"
          value={style.color}
          computed={c?.color}
          tokenColors={tokenColors}
          onChange={(v) => setColor("color", v)}
          onReset={has("color") ? () => reset("color") : undefined}
        />
      </Section>

      <Section title="Fill">
        <ColorField
          label="Background"
          value={style.background ?? style.backgroundColor}
          computed={c?.backgroundColor}
          tokenColors={tokenColors}
          onChange={(v) => setColor(has("background") ? "background" : "backgroundColor", v)}
          onReset={has("background") || has("backgroundColor") ? () => reset("background", "backgroundColor") : undefined}
        />
        <div className="mt-3">
          <Slider
            label="Opacity"
            value={num("opacity", c?.opacity ?? 1)}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setNum("opacity", v)}
            onReset={has("opacity") ? () => reset("opacity") : undefined}
          />
        </div>
      </Section>

      <Section title="Shape">
        <Slider
          label="Corner radius"
          value={num("borderRadius", c?.borderRadius ?? 0)}
          min={0}
          max={Math.max(64, c?.borderRadius ?? 0)}
          unit="px"
          onChange={(v) => setNum("borderRadius", v)}
          onReset={has("borderRadius") ? () => reset("borderRadius") : undefined}
        />
        <div className="mt-3">
          <Slider
            label="Padding"
            value={num("padding", c?.padding ?? 0)}
            min={0}
            max={Math.max(64, c?.padding ?? 0)}
            unit="px"
            onChange={(v) => setNum("padding", v)}
            onReset={has("padding") ? () => reset("padding") : undefined}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-4">
      <h3 className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-fg-subtle uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Action({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-lg border border-line text-fg-muted transition-colors outline-none hover:border-line-strong hover:text-fg focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-30",
        danger && "hover:border-red-500/40 hover:text-red-300",
      )}
    >
      {children}
    </button>
  );
}

function ResetChip({ show, onClick, children }: { show: boolean; onClick: () => void; children: ReactNode }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-fg-subtle hover:bg-white/5 hover:text-fg"
    >
      <RotateCcw className="size-3" /> {children}
    </button>
  );
}

function TextField({ value, focusKey, onCommit }: { value: string; focusKey: number; onCommit: (text: string) => void }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusKey) ref.current?.select();
  }, [focusKey]);
  const commit = () => draft !== value && onCommit(draft);
  return (
    <textarea
      ref={ref}
      aria-label="Text"
      value={draft}
      rows={Math.min(5, Math.ceil(draft.length / 32) || 1)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
      }}
      className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-[13px] leading-snug text-fg outline-none focus:border-accent/60"
    />
  );
}

function NumberInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex h-8 items-center gap-2 rounded-lg border border-line bg-bg px-2.5 focus-within:border-accent/60">
      <span className="text-[11px] font-medium text-fg-subtle">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-right font-mono text-[12px] text-fg tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onReset?: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] text-fg-muted">{label}</span>
        <span className="flex items-center gap-1.5">
          {onReset && (
            <button type="button" aria-label={`Reset ${label}`} onClick={onReset} className="text-fg-subtle hover:text-fg">
              <RotateCcw className="size-3" />
            </button>
          )}
          <span className="font-mono text-[11px] text-fg-subtle tabular-nums">
            {Math.round(value * 100) / 100}
            {unit}
          </span>
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--accent)]"
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  computed,
  tokenColors,
  onChange,
  onReset,
}: {
  label: string;
  value: StyleValue | undefined;
  computed: string | undefined;
  tokenColors: Record<string, string>;
  onChange: (v: string | { token: string }) => void;
  onReset?: () => void;
}) {
  const token = tokenName(value);
  const lit = literal(value);
  const hex = token ? tokenColors[token] : typeof lit === "string" && /^#[0-9a-f]{6}$/i.test(lit) ? lit : computed ? toHex(computed) : null;
  return (
    <div className="mt-3 first:mt-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13px] text-fg-muted">{label}</span>
        <span className="flex items-center gap-2">
          {onReset && (
            <button type="button" aria-label={`Reset ${label}`} onClick={onReset} className="text-fg-subtle hover:text-fg">
              <RotateCcw className="size-3" />
            </button>
          )}
          <span className="font-mono text-[11px] text-fg-subtle uppercase">{token ?? hex ?? "none"}</span>
          <span className="relative size-7 overflow-hidden rounded-lg ring-1 ring-white/15">
            <span className="absolute inset-0" style={{ background: hex ?? "transparent" }} />
            <input
              type="color"
              aria-label={`${label} color`}
              value={hex ?? "#000000"}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </span>
        </span>
      </div>
      {Object.keys(tokenColors).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(tokenColors).map(([name, color]) => (
            <button
              key={name}
              type="button"
              title={`Use ${name} token`}
              aria-label={`Use ${name} token`}
              aria-pressed={token === name}
              onClick={() => onChange({ token: name })}
              className="size-5 rounded-md ring-1 ring-white/15 transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-accent"
              style={{ background: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
