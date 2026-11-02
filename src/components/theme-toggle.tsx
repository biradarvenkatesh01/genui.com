"use client";

import { useId, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export type Theme = "light" | "dark";

const STORAGE_KEY = "genui-theme";

/**
 * Runs in <head> before first paint: saved choice wins, otherwise the OS preference.
 * Keep in sync with `setTheme`.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The theme on <html> right now (set before paint), for code that runs outside render. */
export const readTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "light");
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === "dark";
  const maskId = useId();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light" : "Switch to dark"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "group relative grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      {/* A sun whose rays retract and a mask that slides in to make the crescent. */}
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <motion.circle
            r="6"
            fill="black"
            initial={false}
            animate={{ cx: dark ? 16 : 30, cy: dark ? 8 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          />
        </mask>
        <motion.circle
          cx="12"
          cy="12"
          fill="currentColor"
          stroke="none"
          mask={`url(#${maskId})`}
          initial={false}
          animate={{ r: dark ? 8 : 4.5 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        />
        <motion.g
          initial={false}
          animate={{ opacity: dark ? 0 : 1, scale: dark ? 0.5 : 1, rotate: dark ? -45 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{ originX: "12px", originY: "12px" }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${a} 12 12)`} />
          ))}
        </motion.g>
      </svg>
    </button>
  );
}
