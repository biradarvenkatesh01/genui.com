"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={cn(
          "flex h-12 w-full max-w-5xl items-center justify-between rounded-full px-4 transition-all duration-500 ease-apple",
          scrolled ? "glass shadow-[0_8px_40px_-12px_rgba(0,0,0,.8)]" : "border border-transparent",
        )}
      >
        <Logo />
        <div className="hidden items-center gap-7 text-[13px] text-fg-muted sm:flex">
          <a href="#how" className="transition-colors hover:text-fg">How it works</a>
          <a href="#components" className="transition-colors hover:text-fg">Components</a>
          <a href="#roadmap" className="transition-colors hover:text-fg">Roadmap</a>
        </div>
        <Link
          href="/studio"
          className="inline-flex h-8 items-center rounded-full bg-fg px-4 text-[13px] font-medium text-bg transition-transform hover:scale-[1.03] active:scale-95"
        >
          Open Studio
        </Link>
      </nav>
    </header>
  );
}
