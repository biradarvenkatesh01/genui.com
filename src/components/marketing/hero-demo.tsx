"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Bell, Check, Code2, Copy, Eye, Mic, Monitor, Smartphone, Tablet } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/cn";

type Scene = {
  name: string;
  prompt: string;
  size: string;
  inspector: [string, string][];
  render: () => React.ReactNode;
};

const SCENES: Scene[] = [
  {
    name: "Deploy Button",
    prompt: "A confident deploy button with an arrow that nudges on hover",
    size: "236 × 44",
    inspector: [
      ["Fill", "#141311"],
      ["Radius", "999"],
      ["Spring", "300 / 22"],
    ],
    render: () => <DeployButton />,
  },
  {
    name: "Plan Card",
    prompt: "Compact pricing card for a Pro plan, three perks, quiet and premium",
    size: "300 × 248",
    inspector: [
      ["Surface", "#FFFFFF"],
      ["Radius", "18"],
      ["Duration", "0.6s"],
    ],
    render: () => <PlanCard />,
  },
  {
    name: "Notification Settings",
    prompt: "Settings rows with springy iOS-style toggles",
    size: "320 × 132",
    inspector: [
      ["On", "#E5501E"],
      ["Radius", "14"],
      ["Spring", "500 / 30"],
    ],
    render: () => <SettingsRows />,
  },
];

type Phase = "typing" | "generating" | "shown";

/** A looping, scripted product shot of the Studio: prompt → generate → select. */
export function HeroDemo() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);
  const scene = SCENES[index];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (reduced) {
      timer = setTimeout(() => {
        setIndex((i) => (i + 1) % SCENES.length);
      }, 6000);
      return () => clearTimeout(timer);
    }
    if (phase === "typing") {
      if (typed < scene.prompt.length) timer = setTimeout(() => setTyped((n) => n + 1), 28 + Math.random() * 40);
      else timer = setTimeout(() => setPhase("generating"), 450);
    } else if (phase === "generating") {
      timer = setTimeout(() => setPhase("shown"), 1300);
    } else {
      timer = setTimeout(() => {
        setIndex((i) => (i + 1) % SCENES.length);
        setTyped(0);
        setPhase("typing");
      }, 4200);
    }
    return () => clearTimeout(timer);
  }, [phase, typed, scene.prompt.length, reduced]);

  const shown = reduced || phase === "shown";
  const text = reduced ? scene.prompt : scene.prompt.slice(0, typed);

  return (
    <div className="overflow-hidden rounded-2xl border border-line-strong bg-bg-elevated shadow-lg">
      {/* Toolbar */}
      <div className="flex h-11 items-center justify-between gap-3 border-b border-line px-3.5">
        <div className="flex min-w-0 items-center gap-2.5 text-[12.5px]">
          <LogoMark className="size-[18px] text-fg" />
          <span className="text-fg-subtle">Studio</span>
          <span className="text-fg-subtle">/</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={scene.name}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="truncate font-medium text-fg"
            >
              {scene.name}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-full border border-line p-0.5 sm:flex">
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-bg px-2.5 text-[11px] font-medium text-fg shadow-sm">
              <Eye className="size-3" /> Preview
            </span>
            <span className="inline-flex h-6 items-center gap-1 px-2.5 text-[11px] text-fg-subtle">
              <Code2 className="size-3" /> Code
            </span>
          </div>
          <div className="hidden items-center gap-2.5 px-1 text-fg-subtle md:flex">
            <Monitor className="size-3.5 text-fg" />
            <Tablet className="size-3.5" />
            <Smartphone className="size-3.5" />
          </div>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5 text-[11px] font-medium text-fg-muted">
            <Copy className="size-3" /> Copy code
          </span>
        </div>
      </div>

      <div className="flex h-[420px] sm:h-[480px]">
        {/* Prompt column */}
        <div className="hidden w-[270px] shrink-0 flex-col border-r border-line md:flex">
          <div className="flex-1 space-y-2.5 overflow-hidden p-3.5">
            {SCENES.slice(0, index).map((s) => (
              <p key={s.name} className="rounded-xl px-3 py-2.5 text-[12px] leading-snug text-fg-subtle">
                {s.prompt}
              </p>
            ))}
            <div className="rounded-xl border border-line-strong bg-bg px-3 py-2.5">
              <p className="mb-1 font-mono text-[10px] tracking-wide text-fg-subtle uppercase">v{index + 1} · prompt</p>
              <p className="text-[12.5px] leading-snug text-fg">
                {text}
                {phase === "typing" && !reduced && <span className="caret ml-px inline-block h-3.5 w-px translate-y-0.5 bg-accent" />}
              </p>
            </div>
            {phase === "generating" && (
              <p className="flex items-center gap-2 px-1 text-[11.5px] text-fg-muted">
                <span className="size-3 animate-spin rounded-full border-[1.5px] border-line-strong border-t-accent" />
                Writing component…
              </p>
            )}
          </div>
          <div className="m-3 flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[11.5px] text-fg-subtle">
            Refine it…
            <Mic className="size-3.5" />
          </div>
        </div>

        {/* Canvas */}
        <div className="dot-grid relative flex-1 overflow-hidden bg-bg-sunken">
          {phase === "generating" && !reduced && (
            <motion.div
              className="absolute top-0 left-0 h-[2px] w-1/3 bg-accent"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
            />
          )}
          <div className="absolute inset-0 grid place-items-center p-6">
            <AnimatePresence mode="wait">
              {shown && (
                <motion.div
                  key={scene.name}
                  initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  {scene.render()}
                  <Selection label={`${scene.name.split(" ")[0]} · ${scene.size}`} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="absolute bottom-3 left-3.5 font-mono text-[10px] text-fg-subtle">100%</p>
        </div>

        {/* Inspector */}
        <div className="hidden w-[210px] shrink-0 border-l border-line lg:block">
          <p className="eyebrow border-b border-line px-4 py-3">Design</p>
          <div className="space-y-3.5 p-4">
            {scene.inspector.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[12px]">
                <span className="text-fg-muted">{k}</span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-fg">
                  {v.startsWith("#") && <span className="size-3 rounded-[3px] ring-1 ring-line-strong" style={{ background: v }} />}
                  {v}
                </span>
              </div>
            ))}
            <div className="pt-2">
              <div className="h-1 rounded-full bg-active">
                <motion.div
                  className="h-1 rounded-full bg-accent"
                  animate={{ width: shown ? "62%" : "20%" }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Selection({ label }: { label: string }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="pointer-events-none absolute -inset-2 border-[1.5px] border-accent"
    >
      <span className="absolute -top-6 left-[-1.5px] rounded-[4px] bg-accent px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-accent-fg">
        {label}
      </span>
      {["-top-[5px] -left-[5px]", "-top-[5px] -right-[5px]", "-bottom-[5px] -left-[5px]", "-bottom-[5px] -right-[5px]"].map((p) => (
        <span key={p} className={cn("absolute size-2 border-[1.5px] border-accent bg-bg-elevated", p)} />
      ))}
    </motion.div>
  );
}

function DeployButton() {
  return (
    <motion.button
      type="button"
      tabIndex={-1}
      whileHover="hover"
      whileTap={{ scale: 0.97 }}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-fg pr-4 pl-5 text-[14px] font-medium text-bg shadow-md"
    >
      Deploy to production
      <motion.span variants={{ hover: { x: 2, y: -2 } }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
        <ArrowUpRight className="size-4" />
      </motion.span>
    </motion.button>
  );
}

function PlanCard() {
  return (
    <div className="w-[300px] rounded-[18px] border border-line bg-bg-elevated p-5 text-left shadow-md">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-fg">Pro</p>
        <p className="font-mono text-[10px] tracking-wide text-accent uppercase">Popular</p>
      </div>
      <p className="mt-3 text-[34px] leading-none font-semibold tracking-tight text-fg tabular-nums">
        $19<span className="ml-1 text-[13px] font-normal text-fg-subtle">/mo</span>
      </p>
      <ul className="mt-4 space-y-2 text-[12.5px] text-fg-muted">
        {["Unlimited generations", "Visual editor", "Private library"].map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="size-3.5 text-accent" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-5 grid h-9 place-items-center rounded-[10px] bg-fg text-[12.5px] font-medium text-bg">Start free trial</div>
    </div>
  );
}

function SettingsRows() {
  const [on, setOn] = useState([true, false]);
  return (
    <div className="w-[320px] divide-y divide-line rounded-[14px] border border-line bg-bg-elevated text-left shadow-md">
      {["Deploy succeeded", "Weekly usage digest"].map((label, i) => (
        <div key={label} className="flex items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-2.5 text-[13px] text-fg">
            <Bell className="size-3.5 text-fg-subtle" /> {label}
          </span>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOn((s) => s.map((v, j) => (j === i ? !v : v)))}
            className={cn("flex h-6 w-10 items-center rounded-full p-0.5 transition-colors", on[i] ? "justify-end bg-accent" : "justify-start bg-active")}
          >
            <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className="size-5 rounded-full bg-white shadow-sm" />
          </button>
        </div>
      ))}
    </div>
  );
}
