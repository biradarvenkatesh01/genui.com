"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { ArrowRight, Mic, MousePointer2, Palette, Plus, Wand2 } from "lucide-react";
import { CATEGORIES } from "@/lib/generation/categories";

const ease = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function CategoryMarquee() {
  const items = CATEGORIES.filter((c) => c.id !== "auto");
  return (
    <section aria-label="Component types" className="relative overflow-hidden border-y border-line py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-bg to-transparent" />
      <motion.div
        className="flex w-max gap-3"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items].map((c, i) => (
          <Link
            key={i}
            href={`/studio?category=${c.id}`}
            className="rounded-full border border-line px-5 py-2 text-[14px] whitespace-nowrap text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            {c.label}
          </Link>
        ))}
      </motion.div>
    </section>
  );
}

const STEPS = [
  {
    icon: Mic,
    title: "Describe or dictate",
    body: "Type it, or just say it. Name the component, the vibe and the motion — “a glassy card that tilts toward the cursor.”",
  },
  {
    icon: Wand2,
    title: "Watch it come alive",
    body: "GenUI writes clean React, Tailwind and Motion in real time and renders it on a live, sandboxed canvas.",
  },
  {
    icon: Palette,
    title: "Tweak, then ship",
    body: "Dial in colors, corners and timing with direct controls, ask for refinements, and copy code that’s yours.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-[13px] font-semibold tracking-[0.12em] text-accent uppercase">How it works</p>
        <h2 className="text-gradient mt-4 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
          From idea to interface
          <br /> in one conversation.
        </h2>
      </Reveal>
      <div className="mt-20 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.1}>
            <div className="group relative h-full overflow-hidden rounded-[28px] border border-line bg-bg-elevated p-8 transition-colors hover:border-line-strong">
              <div className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-accent/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
              <span className="font-mono text-[12px] text-fg-subtle">0{i + 1}</span>
              <s.icon className="mt-6 size-7 text-fg" strokeWidth={1.5} />
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Showcase() {
  return (
    <section id="components" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-[13px] font-semibold tracking-[0.12em] text-accent-2 uppercase">Made with GenUI</p>
        <h2 className="text-gradient mt-4 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
          Motion that feels right.
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed text-fg-muted">
          Every component ships with considered physics, accessible markup and tokens you can tune. Go ahead —
          play with these.
        </p>
      </Reveal>
      <div className="mt-16 grid gap-4 md:grid-cols-6">
        <Reveal className="md:col-span-3">
          <Tile label="Magnetic button" prompt="Magnetic CTA button that springs toward the pointer, with a glow on hover">
            <MagneticDemo />
          </Tile>
        </Reveal>
        <Reveal className="md:col-span-3" delay={0.08}>
          <Tile label="Fluid toggle" prompt="iOS-style toggle switch with a springy knob and color morph">
            <ToggleDemo />
          </Tile>
        </Reveal>
        <Reveal className="md:col-span-4" delay={0.04}>
          <Tile label="Accordion" prompt="FAQ accordion with smooth height animation and rotating plus icons">
            <AccordionDemo />
          </Tile>
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.12}>
          <Tile label="Tilt card" prompt="A 3D card that tilts toward the cursor with a moving glare">
            <TiltDemo />
          </Tile>
        </Reveal>
      </div>
    </section>
  );
}

function Tile({ label, prompt, children }: { label: string; prompt: string; children: React.ReactNode }) {
  return (
    <div className="group relative flex h-[320px] flex-col overflow-hidden rounded-[28px] border border-line bg-bg-elevated">
      <div className="grid flex-1 place-items-center p-6">{children}</div>
      <div className="flex items-center justify-between border-t border-line px-6 py-4">
        <span className="text-[13px] font-medium text-fg-muted">{label}</span>
        <Link
          href={`/studio?${new URLSearchParams({ prompt })}`}
          className="inline-flex items-center gap-1 text-[13px] text-fg-subtle transition-colors hover:text-fg"
        >
          Remix <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function MagneticDemo() {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 14 });
  const sy = useSpring(y, { stiffness: 200, damping: 14 });
  return (
    <div
      className="grid size-full place-items-center"
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.3);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.3);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.button
        ref={ref}
        style={{ x: sx, y: sy }}
        whileTap={{ scale: 0.95 }}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-3 px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_40px_-8px_var(--accent)]"
      >
        <MousePointer2 className="size-4" /> Come closer
      </motion.button>
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
      className="flex h-14 w-24 items-center rounded-full p-1.5 transition-colors duration-500"
      style={{ background: on ? "#34C759" : "#3A3A3C", justifyContent: on ? "flex-end" : "flex-start" }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="size-11 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,.3)]"
      />
    </button>
  );
}

const FAQ = [
  ["What can I generate?", "Buttons, cards, navbars, pricing tables, forms, modals — anything you can describe."],
  ["Do I own the code?", "Yes. Copy it straight into your project, no attribution required."],
  ["Can I change the animation?", "Tune duration, delay and spring physics live from the Tweak panel."],
];

function AccordionDemo() {
  const [open, setOpen] = useState(0);
  return (
    <div className="w-full max-w-md divide-y divide-line overflow-hidden rounded-2xl border border-line bg-black/40">
      {FAQ.map(([q, a], i) => (
        <div key={q}>
          <button
            type="button"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? -1 : i)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[14px] font-medium"
          >
            {q}
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <Plus className="size-4 text-fg-muted" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden px-5 text-[13px] leading-relaxed text-fg-muted"
              >
                <span className="block pb-4">{a}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function TiltDemo() {
  const rx = useSpring(0, { stiffness: 150, damping: 15 });
  const ry = useSpring(0, { stiffness: 150, damping: 15 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });
  return (
    <div style={{ perspective: 800 }}>
      <motion.div
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ry.set((px - 0.5) * 24);
          rx.set((0.5 - py) * 24);
          setGlare({ x: px * 100, y: py * 100 });
        }}
        onPointerLeave={() => {
          rx.set(0);
          ry.set(0);
        }}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative h-44 w-36 overflow-hidden rounded-2xl bg-gradient-to-br from-accent-2 via-accent to-accent-3 p-4 shadow-2xl"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,.45), transparent 55%)` }}
        />
        <p className="relative text-[11px] font-semibold tracking-widest text-white/80 uppercase">GenUI</p>
        <p className="relative mt-20 text-[15px] font-semibold text-white">Hover me</p>
      </motion.div>
    </div>
  );
}

const ROADMAP = [
  ["Now", "Prompt & voice generation, live preview, token tweaks, code export"],
  ["Next", "Figma-style visual editor: select any element, edit spacing, type and motion curves"],
  ["Soon", "Accounts, saved libraries, shareable links, brand presets"],
  ["Later", "Pro plans, team workspaces, CLI & editor extensions"],
];

export function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-4xl scroll-mt-24 px-4 pb-32">
      <Reveal className="text-center">
        <h2 className="text-gradient text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
          Just getting started.
        </h2>
      </Reveal>
      <ol className="mt-14 space-y-3">
        {ROADMAP.map(([when, what], i) => (
          <Reveal key={when} delay={i * 0.06}>
            <li className="flex items-center gap-6 rounded-2xl border border-line px-6 py-5">
              <span
                className={
                  "w-14 shrink-0 text-[13px] font-semibold " + (i === 0 ? "text-accent-2" : "text-fg-subtle")
                }
              >
                {when}
              </span>
              <span className="text-[15px] text-fg-muted">{what}</span>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-4 pb-24">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-line bg-bg-elevated px-6 py-20 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-40 mx-auto h-80 w-[80%] rounded-full opacity-40 blur-[100px]"
          style={{ background: "linear-gradient(90deg, var(--accent-2), var(--accent), var(--accent-3))" }}
        />
        <h2 className="text-gradient relative text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
          Your next component is
          <br /> one sentence away.
        </h2>
        <Link
          href="/studio"
          className="relative mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-fg px-7 text-[15px] font-semibold text-bg transition-transform hover:scale-[1.03] active:scale-95"
        >
          Open the Studio <ArrowRight className="size-4" />
        </Link>
      </Reveal>
      <footer className="mx-auto mt-16 flex max-w-5xl flex-col items-center justify-between gap-3 text-[12px] text-fg-subtle sm:flex-row">
        <span>© 2026 GenUI. Built for people who build interfaces.</span>
        <span>React · Tailwind · Motion</span>
      </footer>
    </section>
  );
}
