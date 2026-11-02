"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  Hand,
  Monitor,
  MousePointer2,
  Contrast,
  Plus,
  Redo2,
  Smartphone,
  Palette,
  Spline,
  Tablet,
  Undo2,
  X,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle, readTheme, useTheme } from "@/components/theme-toggle";
import { PromptComposer } from "@/components/prompt-composer";
import { ChatThread } from "./chat-thread";
import { CodeView } from "./code-view";
import { DesignPanel } from "./design-panel";
import { MotionPanel } from "./motion-panel";
import { PreviewFrame, type Canvas, type CanvasKey, type PreviewHandle, type TimelineState } from "./preview-frame";
import { TimelineBar } from "./timeline-bar";
import { TweakPanel } from "./tweak-panel";
import { useCanvasEditor } from "@/lib/editor/use-canvas-editor";
import type { StylePatch } from "@/lib/editor/jsx-source";
import { useGeneration } from "@/lib/generation/use-generation";
import { applyTokensToSource, isHexColor, type TokenObject } from "@/lib/preview/tokens";
import { cn } from "@/lib/cn";

type View = "preview" | "code";
type Mode = "design" | "interact";
type PanelTab = "design" | "motion" | "theme";
type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

export function Studio() {
  const params = useSearchParams();
  const gen = useGeneration();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState(params.get("category") ?? "auto");
  const [view, setView] = useState<View>("preview");
  const [device, setDevice] = useState<Device>("desktop");
  // The preview canvas follows the app theme until the user flips it for this session.
  const theme = useTheme();
  const [canvasOverride, setCanvasOverride] = useState<Canvas | null>(null);
  const canvas: Canvas = canvasOverride ?? theme;
  const [replayKey, setReplayKey] = useState(0);
  const [mode, setMode] = useState<Mode>("design");
  const [panelTab, setPanelTab] = useState<PanelTab>("design");
  const [focusTextKey, setFocusTextKey] = useState(0);
  const [timeline, setTimeline] = useState<TimelineState | null>(null);
  const preview = useRef<PreviewHandle>(null);
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
  const editor = useCanvasEditor(active, gen.updateActiveCode);
  const editing = mode === "design" && !streaming;
  const selectedGid = editor.selectedGid;

  // Code with the user's tweaks written back in — what they copy/download.
  const exportCode = useMemo(
    () => (active ? (overrides ? applyTokensToSource(active.code, overrides) : active.code) : ""),
    [active, overrides],
  );

  const tokenColors = useMemo(() => {
    const colors = (overrides ?? defaults)?.colors;
    if (!colors || typeof colors !== "object") return {};
    return Object.fromEntries(Object.entries(colors).filter((e): e is [string, string] => isHexColor(e[1])));
  }, [overrides, defaults]);

  /** Sends a message with the canvas exactly as the user sees it: tweaks, hand edits and selection included. */
  function run(text: string, target?: string) {
    const info = active ? editor.info : null;
    // Token tweaks can reflow the tokens literal; shift the line to match the code being sent.
    const lineShift = active ? exportCode.split("\n").length - active.code.split("\n").length : 0;
    gen.send(text, {
      category,
      theme: canvas,
      target: target ?? info?.tag,
      canvas: active
        ? {
            code: exportCode,
            name: active.name,
            version: `v${gen.versions.indexOf(active) + 1} of ${gen.versions.length}`,
            manualEdits: editor.manualEdits,
            selection: info
              ? {
                  tag: info.tag,
                  line: info.line + lineShift,
                  snippet: info.snippet,
                  path: editor.computed?.ancestors.map((a) => a.tag),
                }
              : undefined,
          }
        : undefined,
    });
    setPrompt("");
  }

  function styleSelected(patch: StylePatch, previewStyle: Record<string, string>, debounce: boolean) {
    if (selectedGid === null) return;
    preview.current?.previewStyle(selectedGid, previewStyle);
    editor.applyStyle(selectedGid, patch, debounce);
  }

  function onCanvasKey({ key, mod, shift }: CanvasKey) {
    if (mod && key === "z") (shift ? editor.redo : editor.undo)();
    else if (mod && key === "y") editor.redo();
    else if (mod && key === "d") editor.duplicate();
    else if (!mod && (key === "delete" || key === "backspace")) editor.remove();
  }

  // The same shortcuts work when focus is in the studio rather than the canvas.
  const onWindowKey = useEffectEvent((e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (!editing || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (key === "escape") editor.select(null);
    else if ((mod && /^[zyd]$/.test(key)) || (selectedGid !== null && (key === "delete" || key === "backspace"))) {
      e.preventDefault();
      onCanvasKey({ key, mod, shift: e.shiftKey });
    }
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onWindowKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Kick off the prompt handed over from the landing page.
  useEffect(() => {
    const initial = params.get("prompt");
    if (initial && !started.current) {
      started.current = true;
      gen.send(initial, { category: params.get("category") ?? "auto", theme: readTheme() });
    }
  }, [params, gen]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-bg-elevated px-4">
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
          <ThemeToggle />
          <button
            type="button"
            onClick={() => {
              gen.reset();
              setPrompt("");
              router.replace("/studio");
            }}
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-fg px-3.5 text-[13px] font-medium text-bg shadow-sm transition-transform hover:opacity-90 active:scale-95"
          >
            <Plus className="size-3.5" strokeWidth={2.5} /> New
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: conversation */}
        <aside className="order-2 flex min-h-0 shrink-0 flex-col border-line lg:order-1 lg:w-[340px] lg:border-r">
          <div className="min-h-0 flex-1 overflow-y-auto max-lg:max-h-[45vh]">
            <ChatThread
              messages={gen.messages}
              versions={gen.versions}
              activeId={gen.activeId}
              onSelectVersion={gen.setActiveId}
              onRetry={(text, target) => run(text, target)}
              onSuggestion={(text) => run(text)}
            />
          </div>
          <div className="border-t border-line p-3">
            {editor.info && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/10 px-3 py-1.5 text-[12px] text-fg-muted">
                <MousePointer2 className="size-3.5 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate">
                  Changes apply to the selected <span className="font-medium text-fg">{editor.info.tag}</span>
                </span>
                <button
                  type="button"
                  aria-label="Clear selection"
                  onClick={() => editor.select(null)}
                  className="grid size-5 place-items-center rounded-full hover:bg-active hover:text-fg"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            <PromptComposer
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => run(prompt)}
              category={category}
              onCategoryChange={setCategory}
              busy={streaming}
              onStop={gen.stop}
              placeholder={
                editor.info
                  ? `Ask about or change this ${editor.info.tag}…`
                  : active
                    ? "Ask for a change, or ask a question…"
                    : "Describe a component…"
              }
            />
          </div>
        </aside>

        {/* Center: canvas */}
        <main className="order-1 flex min-h-[55vh] min-w-0 flex-1 flex-col p-3 lg:order-2 lg:min-h-0">
          <div className="flex items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-1.5">
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { id: "preview", label: "Preview", icon: Eye },
                  { id: "code", label: "Code", icon: Code2 },
                ]}
              />
              {view === "preview" && (
                <Segmented
                  value={mode}
                  onChange={setMode}
                  iconOnly
                  options={[
                    { id: "design", label: "Design — select, drag and edit", icon: MousePointer2 },
                    { id: "interact", label: "Interact — use it like the real thing", icon: Hand },
                  ]}
                />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <IconButton label="Undo (Ctrl+Z)" onClick={editor.undo} disabled={!editor.canUndo}>
                <Undo2 className="size-4" />
              </IconButton>
              <IconButton label="Redo (Ctrl+Shift+Z)" onClick={editor.redo} disabled={!editor.canRedo}>
                <Redo2 className="size-4" />
              </IconButton>
              <span className="mx-0.5 hidden h-4 w-px bg-line sm:block" />
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
                label={canvas === "dark" ? "Preview on a light canvas" : "Preview on a dark canvas"}
                onClick={() => setCanvasOverride(canvas === "dark" ? "light" : "dark")}
              >
                <Contrast className={cn("size-4 transition-transform duration-300", canvas === "light" && "rotate-180")} />
              </IconButton>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-sm">
            <div className="relative min-h-0 flex-1">
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
                    editing={editing}
                    selected={editor.info && selectedGid !== null ? { gid: selectedGid, label: editor.info.tag } : null}
                    onDefaultTokens={(t) => setDefaultsById((m) => ({ ...m, [activeId]: t }))}
                    onError={(e) => setErrorById((m) => ({ ...m, [activeId]: e }))}
                    onSelect={(s) => {
                      editor.onCanvasSelect(s);
                      // Selecting keeps the Motion tab open; from Theme it switches to Design.
                      if (s) setPanelTab((tab) => (tab === "theme" ? "design" : tab));
                    }}
                    onEdit={(e) => {
                      if (e.op === "style") editor.applyStyle(e.gid, e.style);
                      // Text that can't be written back: re-render so the canvas matches the code again.
                      else if (!editor.applyText(e.gid, e.text)) setReplayKey((k) => k + 1);
                    }}
                    onKey={onCanvasKey}
                    onTextRequest={(gid) => {
                      editor.select(gid);
                      setPanelTab("design");
                      setFocusTextKey((k) => k + 1);
                    }}
                    onTimeline={setTimeline}
                    ref={preview}
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

              <AnimatePresence>
                {editor.notice && (
                  <motion.p
                    role="status"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="popover absolute top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-[12px] text-fg-muted shadow-xl"
                  >
                    {editor.notice}
                  </motion.p>
                )}
              </AnimatePresence>

              {previewError && view === "preview" && active && !streaming && (
                <div className="absolute inset-x-4 bottom-4 flex items-start gap-2 rounded-2xl border border-danger/25 bg-bg-elevated px-4 py-3 text-[12px] text-danger shadow-lg">
                  <AlertTriangle className="mt-px size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 font-mono break-words">{previewError}</span>
                  <button
                    type="button"
                    onClick={() => run(`Fix this runtime error: ${previewError}`)}
                    className="shrink-0 rounded-full bg-danger px-2.5 py-1 font-sans font-medium text-bg-elevated hover:opacity-90"
                  >
                    Auto-fix
                  </button>
                </div>
              )}
            </div>
            {view === "preview" && active && !streaming && (
              <TimelineBar state={timeline} interactive={mode === "interact"} onAction={(a) => preview.current?.timeline(a)} />
            )}
          </div>
        </main>

        {/* Right: tweaks */}
        <aside className="order-3 shrink-0 border-t border-line lg:w-[300px] lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <div className="flex h-12 items-center border-b border-line px-4">
            <Segmented
              value={panelTab}
              onChange={setPanelTab}
              options={[
                { id: "design", label: "Design", icon: MousePointer2 },
                { id: "motion", label: "Motion", icon: Spline },
                { id: "theme", label: "Theme", icon: Palette },
              ]}
            />
          </div>
          {panelTab === "theme" ? (
            <TweakPanel
              defaults={defaults}
              value={overrides}
              onChange={setOverrides}
              onReset={() => setOverrides(null)}
            />
          ) : panelTab === "motion" && editor.info && editor.motion ? (
            <MotionPanel tag={editor.info.tag} motion={editor.motion} onApply={editor.applyMotion} onAnimate={editor.makeAnimatable} />
          ) : panelTab === "design" && editor.info ? (
            <DesignPanel
              info={editor.info}
              computed={editor.computed}
              tokenColors={tokenColors}
              focusTextKey={focusTextKey}
              onStyle={styleSelected}
              onText={(text) => selectedGid !== null && editor.applyText(selectedGid, text)}
              onSelect={editor.select}
              onDelete={editor.remove}
              onDuplicate={editor.duplicate}
              onMove={editor.move}
            />
          ) : (
            <div className="space-y-3 px-5 py-6 text-[13px] leading-relaxed text-fg-subtle">
              <p>
                {!active
                  ? "Generate a component, then edit it here like a design."
                  : panelTab === "motion"
                    ? "Click any element on the canvas to edit how it animates."
                    : "Click any element on the canvas to edit it."}
              </p>
              {active && panelTab === "motion" ? (
                <ul className="space-y-1.5 text-[12px]">
                  <li>Scrub the timeline to any moment — editing works mid-animation</li>
                  <li>Set its entrance, hover and press states</li>
                  <li>Tune easing curves and springs</li>
                </ul>
              ) : active && (
                <ul className="space-y-1.5 text-[12px]">
                  <li>Drag to move · handles to resize</li>
                  <li>Double-click text to retype it</li>
                  <li>Arrows nudge · Del deletes · Ctrl+D duplicates</li>
                  <li>Select something, then prompt to change just that</li>
                </ul>
              )}
            </div>
          )}
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
    <div className="dot-grid absolute inset-0 grid place-items-center bg-bg-sunken p-8">
      <div className="relative text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-6 text-fg-subtle"
        >
          <LogoMark className="mx-auto size-14" />
        </motion.div>
        <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] text-fg">
          What should we <span className="font-serif font-normal italic">build?</span>
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-fg-muted">
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
                className="absolute inset-0 rounded-full bg-bg-elevated shadow-sm"
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

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-30"
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
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
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
