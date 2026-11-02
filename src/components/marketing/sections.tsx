"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/cn";

const ease = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, italic, body }: { eyebrow: string; title: string; italic: string; body?: string }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 text-[clamp(2.1rem,5vw,3.6rem)] leading-[1] font-semibold tracking-[-0.045em] text-fg">
        {title} <span className="font-serif font-normal tracking-[-0.02em] italic">{italic}</span>
      </h2>
      {body && <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-fg-muted">{body}</p>}
    </Reveal>
  );
}

export function StackStrip() {
  const items = ["React 19", "TypeScript", "Tailwind CSS v4", "Motion", "Lucide icons"];
  return (
    <section aria-label="Output stack" className="mx-auto mt-24 max-w-6xl px-5">
      <div className="rule-ticks h-1.5" />
      <div className="flex flex-col items-center justify-between gap-4 py-7 sm:flex-row">
        <p className="eyebrow">Every component ships as</p>
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[15px] font-medium tracking-tight text-fg-muted">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
      <div className="rule-ticks h-1.5" />
    </section>
  );
}

/* ───────────────────────── Features bento ───────────────────────── */

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-32">
      <SectionHeading
        eyebrow="01 — Features"
        title="Everything between idea"
        italic="and import."
        body="GenUI isn't a gallery to dig through. It's a studio: you describe, it builds, and you finish the job with real design controls."
      />
      <div className="mt-16 grid gap-3 md:grid-cols-6">
        <Tile className="md:col-span-4" title="Say it out loud." body="Dictate the component while you think. GenUI hears the vibe, the layout and the motion.">
          <VoiceDemo />
        </Tile>
        <Tile className="md:col-span-2" title="Tune without prompting." body="Colors, corners and springs are live controls. No regeneration.">
          <TuneDemo />
        </Tile>
        <Tile className="md:col-span-2" title="Edit like a design file." body="Click anything on the canvas. Drag, resize, retype.">
          <DragDemo />
        </Tile>
        <Tile className="md:col-span-4" title="Code you'd write yourself." body="Typed, accessible, no wrapper soup. Copy it or download the file.">
          <CodeDemo />
        </Tile>
        <Tile className="md:col-span-3" title="Motion with physics." body="Springs for interaction, eased entrances, reduced-motion respected.">
          <ToggleDemo />
        </Tile>
        <Tile className="md:col-span-3" title="Accessible by default." body="Semantic elements, ARIA, focus rings and keyboard support.">
          <AccordionDemo />
        </Tile>
      </div>
    </section>
  );
}

function Tile({ title, body, className, children }: { title: string; body: string; className?: string; children: React.ReactNode }) {
  return (
    <Reveal className={className}>
      <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-sm transition-shadow duration-500 hover:shadow-md">
        <div className="dot-grid relative grid min-h-[230px] flex-1 place-items-center border-b border-line bg-bg-sunken p-6">{children}</div>
        <div className="p-6">
          <h3 className="text-[17px] font-semibold tracking-tight text-fg">{title}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{body}</p>
        </div>
      </div>
    </Reveal>
  );
}

function VoiceDemo() {
  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="flex h-12 items-center gap-[3px]" aria-hidden>
        {bars.map((i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-fg"
            animate={{ height: [6, 10 + ((i * 37) % 30), 8, 4 + ((i * 53) % 26), 6] }}
            transition={{ duration: 1.6 + (i % 5) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.04 }}
            style={{ opacity: 0.25 + ((i * 17) % 10) / 13 }}
          />
        ))}
      </div>
      <p className="text-center text-[15px] leading-relaxed text-fg-muted">
        “A floating dock like macOS — icons <span className="text-fg">magnify on hover</span>, with a little{" "}
        <span className="font-serif text-[17px] text-accent italic">bounce</span>.”
      </p>
    </div>
  );
}

const SWATCHES = ["#141311", "#E5501E", "#2F6FEB", "#1E8A4C"];

function TuneDemo() {
  const [radius, setRadius] = useState(12);
  const [color, setColor] = useState(SWATCHES[1]);
  return (
    <div className="flex w-full max-w-[220px] flex-col items-center gap-6">
      <motion.span
        layout
        className="grid h-11 w-full place-items-center text-[13.5px] font-medium text-white shadow-md"
        style={{ background: color, borderRadius: radius }}
      >
        Start free trial
      </motion.span>
      <div className="w-full space-y-3">
        <label className="flex items-center justify-between gap-3 text-[12px] text-fg-muted">
          Radius
          <input
            type="range"
            min={0}
            max={22}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="h-1 w-28 cursor-pointer"
            aria-label="Corner radius"
          />
        </label>
        <div className="flex items-center justify-between text-[12px] text-fg-muted">
          Fill
          <div className="flex gap-1.5">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`Fill ${s}`}
                aria-pressed={color === s}
                onClick={() => setColor(s)}
                className="size-5 rounded-full ring-1 ring-line-strong ring-offset-2 ring-offset-bg-sunken transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-fg"
                style={{ background: s }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DragDemo() {
  return (
    <div className="relative h-[170px] w-full max-w-[240px]">
      <motion.div
        drag
        dragConstraints={{ left: -50, right: 50, top: -40, bottom: 40 }}
        dragElastic={0.15}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
        whileDrag={{ scale: 1.03 }}
        className="absolute top-1/2 left-1/2 -mt-[26px] -ml-[80px] cursor-grab active:cursor-grabbing"
      >
        <div className="flex h-[52px] w-[160px] items-center gap-2.5 rounded-xl border border-line bg-bg-elevated px-3 shadow-md">
          <span className="size-7 rounded-full bg-gradient-to-br from-[#e5501e] to-[#f0a36b]" />
          <span className="space-y-1.5">
            <span className="block h-1.5 w-16 rounded-full bg-fg/70" />
            <span className="block h-1.5 w-10 rounded-full bg-fg/25" />
          </span>
        </div>
        <span className="pointer-events-none absolute -inset-1.5 border-[1.5px] border-accent">
          <span className="absolute -top-5 left-[-1.5px] rounded-[3px] bg-accent px-1 font-mono text-[9.5px] text-accent-fg">
            drag me
          </span>
          {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((p) => (
            <span key={p} className={cn("absolute size-[7px] border-[1.5px] border-accent bg-bg-elevated", p)} />
          ))}
        </span>
      </motion.div>
    </div>
  );
}

const CODE: [string, string][][] = [
  [["k", "export default function "], ["t", "DeployButton"], ["p", "({ tokens: t = tokens }) {"]],
  [["p", "  return ("]],
  [["g", "    <motion.button"]],
  [["a", "      whileTap"], ["p", "={{ scale: "], ["n", "0.97"], ["p", " }}"]],
  [["a", "      style"], ["p", "={{ background: t.colors.ink, borderRadius: t.radius }}"]],
  [["a", "      className"], ["p", "="], ["s", '"inline-flex h-11 items-center gap-2 px-5"']],
  [["g", "    >"]],
  [["p", "      Deploy to production"]],
  [["g", "    </motion.button>"]],
  [["p", "  );"]],
  [["p", "}"]],
];

const SYN: Record<string, string> = {
  k: "text-[var(--syn-keyword)]",
  t: "text-[var(--syn-type)]",
  g: "text-[var(--syn-tag)]",
  a: "text-fg",
  n: "text-[var(--syn-number)]",
  s: "text-[var(--syn-string)]",
  p: "text-fg-muted",
};

function CodeDemo() {
  return (
    <div className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-bg-elevated text-left shadow-md">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="font-mono text-[11px] text-fg-subtle">deploy-button.tsx</span>
        <span className="font-mono text-[11px] text-fg-subtle">TSX</span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[11.5px] leading-[1.75]">
        {CODE.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
          >
            <span className="mr-4 inline-block w-4 text-right text-fg-subtle/60 select-none">{i + 1}</span>
            {line.map(([kind, text], j) => (
              <span key={j} className={SYN[kind]}>
                {text}
              </span>
            ))}
          </motion.div>
        ))}
      </pre>
    </div>
  );
}

function ToggleDemo() {
  const [on, setOn] = useState(true);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Demo toggle"
      onClick={() => setOn(!on)}
      className={cn(
        "flex h-14 w-24 items-center rounded-full p-1.5 shadow-inner transition-colors duration-500",
        on ? "justify-end bg-accent" : "justify-start bg-active",
      )}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className="size-11 rounded-full bg-white shadow-md" />
    </button>
  );
}

const FAQ = [
  ["What can I generate?", "Buttons, cards, navbars, pricing tables, forms, modals — anything you can describe."],
  ["Do I own the code?", "Yes. Paste it into your project, no attribution required."],
  ["Can I change the motion?", "Tune duration and spring physics live from the Theme panel."],
];

function AccordionDemo() {
  const [open, setOpen] = useState(0);
  return (
    <div className="w-full max-w-sm divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated text-left shadow-md">
      {FAQ.map(([q, a], i) => (
        <div key={q}>
          <button
            type="button"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? -1 : i)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-[13.5px] font-medium text-fg outline-none focus-visible:bg-hover"
          >
            {q}
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <Plus className="size-4 text-fg-subtle" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden"
              >
                <p className="px-4 pb-3.5 text-[13px] leading-relaxed text-fg-muted">{a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

const STEPS = [
  ["Describe", "Type or dictate what you need: the component, the mood, how it moves. Pick a type if you like."],
  ["Shape", "Watch it render live. Click any element to edit it, or ask for changes in plain words."],
  ["Ship", "Copy clean React with your edits baked in, or download the file. It's yours."],
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-line bg-bg-elevated">
      <div className="mx-auto max-w-6xl scroll-mt-20 px-5 py-32">
        <SectionHeading eyebrow="02 — How it works" title="Three steps." italic="No library hopping." />
        <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <Reveal key={title} delay={i * 0.08} className="bg-bg-elevated">
              <li className="flex h-full flex-col p-8">
                <span className="font-serif text-[64px] leading-none text-fg-subtle/70 italic">{i + 1}</span>
                <h3 className="mt-10 text-[20px] font-semibold tracking-tight text-fg">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────── Roadmap ───────────────────────── */

const ROADMAP = [
  ["Now", "Chat-driven generation, canvas editing, a motion editor with a scrubbable timeline, code export", true],
  ["Next", "Side-by-side variants, more export targets", false],
  ["Soon", "Accounts, saved libraries, shareable links, brand presets", false],
  ["Later", "Pro plans, team workspaces, CLI and editor extensions", false],
] as const;

export function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-32">
      <SectionHeading eyebrow="03 — Roadmap" title="Just getting" italic="started." />
      <ol className="mt-14 border-t border-line">
        {ROADMAP.map(([when, what, live], i) => (
          <Reveal key={when} delay={i * 0.05}>
            <li className="grid grid-cols-[88px_1fr] items-baseline gap-6 border-b border-line py-6 sm:grid-cols-[160px_1fr]">
              <span className={cn("flex items-center gap-2 font-mono text-[12px] tracking-wide uppercase", live ? "text-accent" : "text-fg-subtle")}>
                {live && <span className="size-1.5 animate-pulse rounded-full bg-accent" />}
                {when}
              </span>
              <span className="text-[17px] leading-snug text-fg">{what}</span>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/* ───────────────────────── CTA & footer ───────────────────────── */

export function FinalCta() {
  return (
    <section className="px-5 pb-10">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-fg px-6 py-24 text-center text-bg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: "radial-gradient(var(--bg) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <h2 className="relative text-[clamp(2.2rem,6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.045em]">
          Your next component is
          <br />
          <span className="font-serif font-normal tracking-[-0.02em] italic">one sentence away.</span>
        </h2>
        <Link
          href="/studio"
          className="group relative mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-medium text-accent-fg shadow-lg transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
        >
          Open the Studio
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
      <footer className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-line pt-8 pb-4 text-[12.5px] text-fg-subtle sm:flex-row">
        <span className="flex items-center gap-2">
          <LogoMark className="size-4 text-fg" /> © 2026 GenUI. Built for people who build interfaces.
        </span>
        <span className="flex items-center gap-3">
          React · Tailwind · Motion
          <ThemeToggle />
        </span>
      </footer>
    </section>
  );
}
