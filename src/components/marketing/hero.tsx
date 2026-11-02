"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { PromptComposer } from "@/components/prompt-composer";
import { CATEGORIES } from "@/lib/generation/categories";
import { HeroDemo } from "./hero-demo";

const ease = [0.22, 1, 0.36, 1] as const;

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease, delay },
});

export function Hero() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("auto");

  function go(text: string) {
    router.push(`/studio?${new URLSearchParams({ prompt: text, category })}`);
  }

  return (
    <section className="relative isolate overflow-hidden px-5 pt-32 sm:pt-40">
      {/* Hairline drafting grid, fading out from the top. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          backgroundPosition: "center top",
          maskImage: "linear-gradient(to bottom, black, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-5xl text-center">
        <motion.p {...rise(0)} className="eyebrow inline-flex items-center gap-2">
          <span className="size-1.5 bg-accent" /> Component studio · Early preview
        </motion.p>

        <motion.h1
          {...rise(0.06)}
          className="mt-7 text-[clamp(2.9rem,7.4vw,5.9rem)] leading-[0.92] font-semibold tracking-[-0.05em] text-fg"
        >
          Describe a component.
          <br />
          <span className="font-serif text-[1.08em] font-normal tracking-[-0.02em] italic">Get the code.</span>
        </motion.h1>

        <motion.p
          {...rise(0.14)}
          className="mx-auto mt-7 max-w-xl text-[clamp(1.02rem,1.8vw,1.18rem)] leading-relaxed text-fg-muted"
        >
          Stop hunting through ten component libraries. Say what you need — the look, the motion, the feel — and
          get clean React, Tailwind and Motion you can edit visually and ship.
        </motion.p>

        <motion.div {...rise(0.22)} className="mx-auto mt-10 max-w-2xl text-left">
          <PromptComposer
            size="hero"
            value={prompt}
            onChange={setPrompt}
            onSubmit={() => go(prompt)}
            category={category}
            onCategoryChange={setCategory}
            placeholder="A pricing card whose border lights up where the cursor is…"
          />
          <p className="mt-3 text-center font-mono text-[11px] text-fg-subtle">
            Press <kbd className="rounded border border-line px-1 py-px">↵</kbd> to generate — or tap the mic and say it
          </p>
        </motion.div>

        <motion.div {...rise(0.3)} className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-1.5">
          {CATEGORIES.filter((c) => c.id !== "auto")
            .slice(0, 8)
            .map((c) => (
              <Link
                key={c.id}
                href={`/studio?category=${c.id}`}
                className="rounded-full border border-line px-3 py-1 text-[12.5px] text-fg-muted transition-colors hover:border-line-strong hover:bg-bg-elevated hover:text-fg"
              >
                {c.label}
              </Link>
            ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease, delay: 0.4 }}
        className="mx-auto mt-20 max-w-6xl"
      >
        <HeroDemo />
      </motion.div>
    </section>
  );
}
