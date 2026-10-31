"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { PromptComposer } from "@/components/prompt-composer";
import { PROMPT_IDEAS } from "@/lib/generation/categories";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("auto");

  function go(text: string) {
    const q = new URLSearchParams({ prompt: text, category });
    router.push(`/studio?${q}`);
  }

  return (
    <section className="relative isolate overflow-hidden px-4 pt-36 pb-24 sm:pt-44">
      <Aurora />
      <div className="mx-auto max-w-3xl text-center">
        <motion.a
          href="#how"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-fg-muted backdrop-blur transition-colors hover:text-fg"
        >
          <span className="size-1.5 rounded-full bg-accent-2 shadow-[0_0_10px_var(--accent-2)]" />
          Now in early preview
        </motion.a>

        <motion.h1
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease, delay: 0.05 }}
          className="text-gradient text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.045em]"
        >
          Describe it.
          <br />
          <span className="text-aurora">Ship it.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.18 }}
          className="mx-auto mt-6 max-w-xl text-[clamp(1rem,2vw,1.2rem)] leading-relaxed text-fg-muted"
        >
          Stop digging through ten component libraries. Tell GenUI what you need — the look, the motion,
          the feel — and get production-ready React you can tweak and ship in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease, delay: 0.3 }}
          className="mx-auto mt-12 max-w-2xl text-left"
        >
          <PromptComposer
            size="hero"
            value={prompt}
            onChange={setPrompt}
            onSubmit={() => go(prompt)}
            category={category}
            onCategoryChange={setCategory}
            placeholder="A pricing card with a glowing border that follows the cursor…"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2"
        >
          {PROMPT_IDEAS.slice(0, 4).map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => go(idea)}
              className="rounded-full border border-line px-3.5 py-1.5 text-[12px] text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
            >
              {idea.length > 42 ? idea.slice(0, 40) + "…" : idea}
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <motion.div
        className="absolute top-[-10%] left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
        style={{ background: "conic-gradient(from 180deg, var(--accent-2), var(--accent), var(--accent-3), var(--accent-2))" }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--bg)_65%)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 20%, black 10%, transparent 60%)",
        }}
      />
    </div>
  );
}
