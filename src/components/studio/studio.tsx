"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  Monitor,
  Moon,
  Plus,
  RotateCw,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { PromptComposer } from "@/components/prompt-composer";
import { CodeView } from "./code-view";
import { PreviewFrame, type Canvas } from "./preview-frame";
import { TweakPanel } from "./tweak-panel";
import { useGeneration } from "@/lib/generation/use-generation";
import { PROMPT_IDEAS, getCategory } from "@/lib/generation/categories";
import { applyTokensToSource, type TokenObject } from "@/lib/preview/tokens";
import { cn } from "@/lib/cn";

type View = "preview" | "code";
type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

export function Studio() {
  const params = useSearchParams();
  const gen = useGeneration();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState(params.get("category") ?? "auto");
  const [view, setView] = useState<View>("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [canvas, setCanvas] = useState<Canvas>("dark");
  const [replayKey, setReplayKey] = useState(0);
  // Per-version state, keyed by version id so switching versions needs no reset.
  const [defaultsById, setDefaultsById] = useState<Record<string, TokenObject | null>>({});
  const [overridesById, setOverridesById] = useState<Record<string, TokenObject | null>>({});
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});
  const started = useRef(false);

  const router = useRouter();
  const streaming = gen.status === "streaming";
  const active = gen.active;
  const activeId = gen.activeId ?? "";
  const defaults = defaultsById[activeId] ?? null;
  const overrides = overridesById[activeId] ?? null;
  const previewError = errorById[activeId] ?? null;
  const setOverrides = (t: TokenObject | null) => setOverridesById((m) => ({ ...m, [activeId]: t }));

  // Code with the user's tweaks written back in — what they copy/download.
  const exportCode = useMemo(
    () => (active ? (overrides ? applyTokensToSource(active.code, overrides) : active.code) : ""),
    [active, overrides],
  );

  function run(text: string) {
    const refine = Boolean(active);
    gen.generate(text, category, { refine, baseCode: exportCode });
    setPrompt("");
  }

  // Kick off the prompt handed over from the landing page.
  useEffect(() => {
    const initial = params.get("prompt");
    if (initial && !started.current) {
      started.current = true;
      gen.generate(initial, params.get("category") ?? "auto");
    }
  }, [params, gen]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Logo />
          <span className="hidden h-4 w-px bg-line-strong sm:block" />
          <span className="hidden truncate text-[13px] text-fg-muted sm:block">{active?.name ?? "New component"}</span>
          {gen.demo && (
            <span className="hidden rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent sm:inline">
              Demo mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {active && <CopyButton text={exportCode} />}
          {active && (
            <IconButton
              label="Download .tsx"
              onClick={() => download(exportCode, slug(active.name) + ".tsx")}
            >
              <Download className="size-4" />
            </IconButton>
          )}
          <button
            type="button"
            onClick={() => {
              gen.reset();
              setPrompt("");
              router.replace("/studio");
            }}
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-fg px-3.5 text-[13px] font-medium text-bg transition-transform active:scale-95"
          >
            <Plus className="size-3.5" strokeWidth={2.5} /> New
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: conversation */}
        <aside className="order-2 flex min-h-0 shrink-0 flex-col border-line lg:order-1 lg:w-[340px] lg:border-r">
          <div className="hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:block">
            {gen.versions.length === 0 && !streaming ? (
              <div className="space-y-2">
                <p className="mb-3 text-[12px] font-medium text-fg-subtle">Try one of these</p>
                {PROMPT_IDEAS.slice(0, 4).map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => run(idea)}
                    className="block w-full rounded-2xl border border-line px-4 py-3 text-left text-[13px] leading-snug text-fg-muted transition-colors hover:border-line-strong hover:bg-white/[0.03] hover:text-fg"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            ) : (
              <ol className="space-y-3">
                {gen.versions.map((v, i) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => gen.setActiveId(v.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                        v.id === gen.activeId
                          ? "border-line-strong bg-white/[0.05]"
                          : "border-transparent hover:bg-white/[0.03]",
                      )}
                    >
                      <span className="mb-1 flex items-center justify-between text-[11px] text-fg-subtle">
                        <span>v{i + 1} · {getCategory(v.category).label}</span>
                        {v.id === gen.activeId && <span className="size-1.5 rounded-full bg-accent" />}
                      </span>
                      <span className="line-clamp-3 text-[13px] leading-snug text-fg">{v.prompt}</span>
                    </button>
                  </li>
                ))}
                {streaming && (
                  <li className="relative overflow-hidden rounded-2xl border border-line px-4 py-3">
                    <span className="shimmer absolute inset-0" />
                    <span className="flex items-center gap-2 text-[13px] text-fg-muted">
                      <Sparkles className="size-3.5 text-accent" /> Designing…
                    </span>
                  </li>
                )}
              </ol>
            )}
          </div>
          <div className="border-t border-line p-3 lg:border-t-0">
            {gen.error && (
              <p role="alert" className="mb-2 flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                <AlertTriangle className="mt-px size-3.5 shrink-0" /> {gen.error}
              </p>
            )}
            <PromptComposer
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => run(prompt)}
              category={category}
              onCategoryChange={setCategory}
              busy={streaming}
              onStop={gen.stop}
              placeholder={active ? "Refine it — “make it pink”, “add a hover tilt”…" : "Describe a component…"}
            />
          </div>
        </aside>

        {/* Center: canvas */}
        <main className="order-1 flex min-h-[55vh] min-w-0 flex-1 flex-col p-3 lg:order-2 lg:min-h-0">
          <div className="flex items-center justify-between gap-2 pb-3">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { id: "preview", label: "Preview", icon: Eye },
                { id: "code", label: "Code", icon: Code2 },
              ]}
            />
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:block">
                <Segmented
                  value={device}
                  onChange={setDevice}
                  iconOnly
                  options={[
                    { id: "desktop", label: "Desktop", icon: Monitor },
                    { id: "tablet", label: "Tablet", icon: Tablet },
                    { id: "mobile", label: "Mobile", icon: Smartphone },
                  ]}
                />
              </div>
              <IconButton
                label={canvas === "dark" ? "Light canvas" : "Dark canvas"}
                onClick={() => setCanvas((c) => (c === "dark" ? "light" : "dark"))}
              >
                {canvas === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </IconButton>
              <IconButton label="Replay animation" onClick={() => setReplayKey((k) => k + 1)}>
                <RotateCw className="size-4" />
              </IconButton>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] border border-line bg-bg-elevated">
            {/* Preview stays mounted so the iframe runtime is reused between versions. */}
            <div className={cn("absolute inset-0 flex justify-center", (view !== "preview" || !active) && "invisible")}>
              <motion.div
                animate={{ width: DEVICE_WIDTH[device] }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className={cn("h-full max-w-full", device !== "desktop" && "border-x border-line")}
              >
                <PreviewFrame
                  code={active?.code ?? null}
                  tokens={overrides}
                  canvas={canvas}
                  replayKey={replayKey}
                  onDefaultTokens={(t) => setDefaultsById((m) => ({ ...m, [activeId]: t }))}
                  onError={(e) => setErrorById((m) => ({ ...m, [activeId]: e }))}
                />
              </motion.div>
            </div>

            {view === "code" && active && !streaming && (
              <div className="absolute inset-0">
                <CodeView code={exportCode} />
              </div>
            )}

            <AnimatePresence>
              {streaming && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-bg-elevated/95 backdrop-blur-sm"
                >
                  <StreamingCode code={gen.streamingCode} />
                </motion.div>
              )}
            </AnimatePresence>

            {!active && !streaming && <EmptyCanvas />}

            {previewError && view === "preview" && active && !streaming && (
              <div className="absolute inset-x-4 bottom-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-[#1a0d0f]/95 px-4 py-3 text-[12px] text-red-200 backdrop-blur">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 font-mono break-words">{previewError}</span>
                <button
                  type="button"
                  onClick={() => run(`Fix this runtime error: ${previewError}`)}
                  className="shrink-0 rounded-full bg-red-500/20 px-2.5 py-1 font-sans font-medium text-red-100 hover:bg-red-500/30"
                >
                  Auto-fix
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Right: tweaks */}
        <aside className="order-3 shrink-0 border-t border-line lg:w-[300px] lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <div className="flex h-12 items-center border-b border-line px-5">
            <h2 className="text-[13px] font-semibold">Tweak</h2>
          </div>
          <TweakPanel
            defaults={defaults}
            value={overrides}
            onChange={setOverrides}
            onReset={() => setOverrides(null)}
          />
        </aside>
      </div>
    </div>
  );
}

function StreamingCode({ code }: { code: string }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [code]);
  return (
    <div className="flex size-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3 text-[12px] text-fg-muted">
        <motion.span
          className="size-2 rounded-full bg-accent"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        {code ? "Writing component…" : "Thinking through the design…"}
      </div>
      <pre
        ref={ref}
        className="min-h-0 flex-1 overflow-auto px-5 py-4 font-mono text-[12px] leading-relaxed text-fg-muted"
      >
        {code}
        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-accent" />
      </pre>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="absolute inset-0 grid place-items-center p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="relative text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-accent-2/20 via-accent/20 to-accent-3/20 ring-1 ring-white/10"
        >
          <Sparkles className="size-6 text-accent" />
        </motion.div>
        <h2 className="text-gradient text-2xl font-semibold tracking-tight">What should we build?</h2>
        <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-fg-subtle">
          Describe a component, its style and how it should move. Type it or say it.
        </p>
      </div>
    </div>
  );
}

type SegOption<T extends string> = { id: T; label: string; icon: React.ComponentType<{ className?: string }> };

function Segmented<T extends string>({
  value,
  onChange,
  options,
  iconOnly,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  iconOnly?: boolean;
}) {
  return (
    <div role="tablist" className="flex rounded-full border border-line bg-bg-elevated p-0.5">
      {options.map((o) => {
        const Icon = o.icon;
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative inline-flex h-7 items-center gap-1.5 rounded-full text-[12px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
              iconOnly ? "w-8 justify-center" : "px-3",
              on ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
            )}
          >
            {on && (
              <motion.span
                layoutId={"seg-" + options.map((x) => x.id).join("")}
                className="absolute inset-0 rounded-full bg-white/10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="relative size-3.5" />
            {!iconOnly && <span className="relative">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
      <span className="hidden sm:inline">{copied ? "Copied" : "Copy code"}</span>
    </button>
  );
}

function slug(name: string) {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "component";
}

function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
