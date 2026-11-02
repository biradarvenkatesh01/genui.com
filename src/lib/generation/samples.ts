// Bundled components used in demo mode (no API key configured). They follow the
// same contract as model output. Sample code must not contain backticks or "${".

const magneticButton = String.raw`// @name Magnetic Glow Button
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { ArrowRight } from "lucide-react";

export const tokens = {
  colors: { primary: "#E5501E", glow: "#FF8A5B", text: "#FFFFFF", surface: "#141311" },
  radius: 999,
  motion: { stiffness: 220, damping: 16 },
};

export default function Component({ tokens: t = tokens }: { tokens?: typeof tokens }) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: t.motion.stiffness, damping: t.motion.damping });
  const sy = useSpring(y, { stiffness: t.motion.stiffness, damping: t.motion.damping });

  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  }

  return (
    <div className="flex items-center justify-center p-16">
      <motion.button
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={() => { x.set(0); y.set(0); }}
        whileTap={{ scale: 0.96 }}
        style={{ x: sx, y: sy, borderRadius: t.radius, color: t.colors.text, background: "linear-gradient(135deg, " + t.colors.primary + ", " + t.colors.glow + ")", boxShadow: "0 10px 40px -10px " + t.colors.glow + "AA" }}
        className="group relative inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ borderRadius: t.radius, boxShadow: "0 0 0 1px rgba(255,255,255,.25) inset, 0 0 60px " + t.colors.glow + "88" }} />
        Start building
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </motion.button>
    </div>
  );
}
`;

const pricingCard = String.raw`// @name Spotlight Pricing Card
import { useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";

export const tokens = {
  colors: { primary: "#FF6A3D", spotlight: "#FFC29E", surface: "#141311", text: "#F3F1EC", muted: "#9A968E" },
  radius: 28,
  motion: { duration: 0.7, delay: 0.08 },
};

const features = ["Unlimited generations", "Visual motion editor", "Export to React, HTML & Vue", "Private component library", "Priority model access"];

export default function Component({ tokens: t = tokens }: { tokens?: typeof tokens }) {
  const [pos, setPos] = useState({ x: 50, y: 0 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: t.motion.duration, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      className="relative w-full max-w-sm p-px"
      style={{ borderRadius: t.radius, background: "radial-gradient(400px circle at " + pos.x + "% " + pos.y + "%, " + t.colors.spotlight + ", " + t.colors.primary + "55 40%, transparent 70%)" }}
    >
      <div className="relative overflow-hidden p-8" style={{ borderRadius: t.radius - 1, background: t.colors.surface, color: t.colors.text }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Pro</h3>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: t.colors.primary + "22", color: t.colors.primary }}>
            <Sparkles className="size-3" /> Most popular
          </span>
        </div>
        <p className="mt-6 flex items-baseline gap-1">
          <span className="text-5xl font-semibold tracking-tighter">$19</span>
          <span style={{ color: t.colors.muted }}>/ month</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: t.colors.muted }}>
          For developers who ship interfaces every day.
        </p>
        <ul className="mt-8 space-y-3">
          {features.map((f, i) => (
            <motion.li
              key={f}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * t.motion.delay, duration: t.motion.duration * 0.6 }}
              className="flex items-center gap-3 text-sm"
            >
              <span className="grid size-5 place-items-center rounded-full" style={{ background: t.colors.primary + "26" }}>
                <Check className="size-3" style={{ color: t.colors.primary }} />
              </span>
              {f}
            </motion.li>
          ))}
        </ul>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-10 w-full py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ borderRadius: t.radius / 2, background: t.colors.text, color: t.colors.surface }}
        >
          Upgrade to Pro
        </motion.button>
      </div>
    </motion.div>
  );
}
`;

const accordion = String.raw`// @name Smooth FAQ Accordion
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

export const tokens = {
  colors: { primary: "#E5501E", surface: "#181816", border: "#2A2926", text: "#EDEBE6", muted: "#A5A29B" },
  radius: 18,
  motion: { duration: 0.35, stiffness: 300, damping: 26 },
};

const items = [
  { q: "How does GenUI generate components?", a: "Describe what you need in plain language. GenUI writes a React component with Tailwind and Motion, then renders it live so you can refine it instantly." },
  { q: "Can I edit colors and animations without code?", a: "Yes. Every component exposes design tokens, so you can tune colors, corner radius and motion timing from the Tweak panel and copy the updated code." },
  { q: "Which frameworks are supported?", a: "React with Tailwind CSS v4 and Motion today. Plain HTML and Vue exports are on the roadmap." },
  { q: "Is the code mine to use?", a: "Completely. Everything you generate is yours to ship in personal and commercial projects." },
];

export default function Component({ tokens: t = tokens }: { tokens?: typeof tokens }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="w-full max-w-xl" style={{ color: t.colors.text }}>
      <h2 className="mb-6 text-3xl font-semibold tracking-tight">Questions, answered.</h2>
      <div className="overflow-hidden" style={{ borderRadius: t.radius, background: t.colors.surface, border: "1px solid " + t.colors.border }}>
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} style={{ borderTop: i ? "1px solid " + t.colors.border : undefined }}>
              <button
                aria-expanded={isOpen}
                aria-controls={"faq-" + i}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left text-[15px] font-medium outline-none focus-visible:bg-white/5"
              >
                {item.q}
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ type: "spring", stiffness: t.motion.stiffness, damping: t.motion.damping }}
                  className="grid size-7 shrink-0 place-items-center rounded-full"
                  style={{ background: isOpen ? t.colors.primary : t.colors.border }}
                >
                  <Plus className="size-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={"faq-" + i}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: t.motion.duration, ease: [0.32, 0.72, 0, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-[15px] leading-relaxed" style={{ color: t.colors.muted }}>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;

const segmentedTabs = String.raw`// @name Fluid Segmented Tabs
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutGrid, Code2, Palette } from "lucide-react";

export const tokens = {
  colors: { primary: "#EDEBE6", surface: "#181816", track: "#24231F", text: "#EDEBE6", muted: "#A5A29B" },
  radius: 14,
  motion: { stiffness: 400, damping: 32, duration: 0.25 },
};

const tabs = [
  { id: "preview", label: "Preview", icon: LayoutGrid, body: "See your component rendered live on a pixel-perfect canvas." },
  { id: "code", label: "Code", icon: Code2, body: "Clean, typed React with Tailwind classes you would write yourself." },
  { id: "tweak", label: "Tweak", icon: Palette, body: "Dial in colors, corners and motion without leaving the studio." },
];

export default function Component({ tokens: t = tokens }: { tokens?: typeof tokens }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((x) => x.id === active)!;

  return (
    <div className="w-full max-w-md" style={{ color: t.colors.text }}>
      <div role="tablist" className="relative flex p-1" style={{ background: t.colors.track, borderRadius: t.radius }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className="relative z-10 flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40"
              style={{ color: isActive ? t.colors.surface : t.colors.muted, borderRadius: t.radius - 4 }}
            >
              {isActive && (
                <motion.span
                  layoutId="pill"
                  className="absolute inset-0 -z-10"
                  style={{ background: t.colors.primary, borderRadius: t.radius - 4 }}
                  transition={{ type: "spring", stiffness: t.motion.stiffness, damping: t.motion.damping }}
                />
              )}
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 p-6" style={{ background: t.colors.surface, borderRadius: t.radius + 4 }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={current.id}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: t.motion.duration }}
            className="text-[15px] leading-relaxed"
            style={{ color: t.colors.muted }}
          >
            {current.body}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
`;

type Sample = { code: string; reply: string; light: [string, string][] };

const SAMPLES: Record<string, Sample> = {
  button: {
    code: magneticButton,
    reply: "Here's a magnetic call-to-action: it springs toward the pointer and glows on hover.",
    light: [],
  },
  card: {
    code: pricingCard,
    reply: "Here's a pricing card with a spotlight border that follows the cursor and a staggered feature list.",
    light: [
      ['"#141311"', '"#FFFFFF"'],
      ['"#F3F1EC"', '"#18181B"'],
      ['"#9A968E"', '"#6B6964"'],
      ['"#FF6A3D"', '"#E5501E"'],
      ['"#FFC29E"', '"#FFB38A"'],
    ],
  },
  accordion: {
    code: accordion,
    reply: "Here's an FAQ accordion with a smooth height animation and a plus icon that springs into a close icon.",
    light: [
      ['"#181816"', '"#FFFFFF"'],
      ['"#2A2926"', '"#E7E5DF"'],
      ['"#EDEBE6"', '"#18181B"'],
      ['"#A5A29B"', '"#6B6964"'],
    ],
  },
  tabs: {
    code: segmentedTabs,
    reply: "Here's a segmented tab control with a sliding pill and a soft blur crossfade between panels.",
    light: [
      ['"#EDEBE6"', '"#18181B"'],
      ['"#181816"', '"#FFFFFF"'],
      ['"#24231F"', '"#EAE8E2"'],
      ['"#A5A29B"', '"#6B6964"'],
    ],
  },
};
SAMPLES.pricing = SAMPLES.card;

const KEYWORDS: [RegExp, string][] = [
  [/accordion|faq|collaps/i, "accordion"],
  [/pric|plan|tier|card/i, "card"],
  [/tab|segment/i, "tabs"],
  [/button|cta/i, "button"],
];

const DEMO_NOTE = "(Demo mode: this is a bundled sample. Add a GROQ_API_KEY or GEMINI_API_KEY for real generations.)";

/** A bundled reply in the same shape the model produces: a short message, then the component. */
export function demoReply(category: string, prompt: string, theme: "light" | "dark", refining: boolean): string {
  let sample = SAMPLES[category];
  for (const [re, id] of KEYWORDS) if (!sample && re.test(prompt)) sample = SAMPLES[id];
  sample ??= SAMPLES.card;
  const code = theme === "light" ? sample.light.reduce((c, [from, to]) => c.split(from).join(to), sample.code) : sample.code;
  const reply = refining
    ? "Demo mode can't apply changes, so this is a bundled sample again. Add a GROQ_API_KEY or GEMINI_API_KEY and I'll make that change for real."
    : `${sample.reply} ${DEMO_NOTE}`;
  return `${reply}\n\n\`\`\`tsx\n${code}\`\`\``;
}
