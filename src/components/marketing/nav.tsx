"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

const LINKS = [
  ["Features", "#features"],
  ["How it works", "#how"],
  ["Roadmap", "#roadmap"],
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-apple",
        scrolled ? "border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150" : "border-transparent",
      )}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Logo />
        <div className="hidden items-center gap-8 text-[13px] text-fg-muted md:flex">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="transition-colors hover:text-fg">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/studio"
            className="inline-flex h-8 items-center rounded-full bg-fg px-4 text-[13px] font-medium text-bg transition-opacity hover:opacity-85 active:scale-[0.97]"
          >
            Open Studio
          </Link>
        </div>
      </nav>
    </header>
  );
}
