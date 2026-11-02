"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, ChevronDown, Mic, Square, Check } from "lucide-react";
import { CATEGORIES, getCategory } from "@/lib/generation/categories";
import { useSpeech } from "@/lib/use-speech";
import { cn } from "@/lib/cn";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  category: string;
  onCategoryChange: (id: string) => void;
  busy?: boolean;
  onStop?: () => void;
  placeholder?: string;
  size?: "hero" | "compact";
  autoFocus?: boolean;
};

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  category,
  onCategoryChange,
  busy,
  onStop,
  placeholder = "Describe a component…",
  size = "compact",
  autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeech(onChange);
  const hero = size === "hero";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, hero ? 220 : 180) + "px";
  }, [value, hero]);

  function submit() {
    if (speech.listening) speech.stop();
    if (value.trim() && !busy) onSubmit();
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[20px] border bg-bg-elevated shadow-md transition-[border-color,box-shadow] duration-300 focus-within:border-accent/50 focus-within:shadow-[var(--shadow-md),0_0_0_4px_var(--accent-soft)]",
        busy || speech.listening ? "border-accent/50" : "border-line-strong",
      )}
    >
      {busy && (
        <motion.span
          aria-hidden
          className="absolute top-0 left-0 h-[2px] w-1/3 bg-accent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        />
      )}
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        rows={hero ? 2 : 1}
        placeholder={speech.listening ? "Listening…" : placeholder}
        aria-label="Describe the component you want"
        className={cn(
          "block w-full resize-none bg-transparent px-5 text-fg outline-none placeholder:text-fg-subtle",
          hero ? "pt-5 pb-2 text-[17px] leading-relaxed" : "pt-4 pb-1 text-[15px] leading-relaxed",
        )}
      />
      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <CategoryMenu value={category} onChange={onCategoryChange} />
        <div className="flex items-center gap-1.5">
          {speech.supported && (
            <button
              type="button"
              onClick={speech.toggle}
              aria-label={speech.listening ? "Stop dictation" : "Dictate with your voice"}
              aria-pressed={speech.listening}
              className={cn(
                "relative grid size-9 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
                speech.listening ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-hover hover:text-fg",
              )}
            >
              {speech.listening && (
                <motion.span
                  className="absolute inset-0 rounded-full border border-accent/60"
                  animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <Mic className="size-[18px]" />
            </button>
          )}
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="grid size-9 place-items-center rounded-full bg-fg text-bg transition-transform active:scale-95"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!value.trim()}
              aria-label="Generate component"
              className="grid size-9 place-items-center rounded-full bg-accent text-accent-fg shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:bg-active disabled:text-fg-subtle disabled:shadow-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
            >
              <ArrowUp className="size-[18px]" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryMenu({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const current = getCategory(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {current.label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="popover absolute bottom-full left-0 z-50 mb-2 max-h-80 w-60 origin-bottom-left overflow-y-auto rounded-2xl p-1.5 scrollbar-none"
          >
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === value}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-hover"
                >
                  <span>
                    <span className="block text-[13px] font-medium text-fg">{c.label}</span>
                    <span className="block text-[11px] text-fg-subtle">{c.hint}</span>
                  </span>
                  {c.id === value && <Check className="size-4 text-accent" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
