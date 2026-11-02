import Link from "next/link";

/** The mark is a selection box with handles: GenUI is where components get picked up and shaped. */
export function LogoMark({ className = "size-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="4.5" y="4.5" width="15" height="15" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {[
        [4.5, 4.5],
        [19.5, 4.5],
        [4.5, 19.5],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 2} y={y - 2} width="4" height="4" fill="var(--bg)" stroke="currentColor" strokeWidth="1.5" />
      ))}
      <rect x="17.5" y="17.5" width="4" height="4" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2 rounded-md text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label="GenUI home"
    >
      <LogoMark className="size-[22px] transition-transform duration-500 ease-apple group-hover:rotate-90" />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">GenUI</span>
    </Link>
  );
}
