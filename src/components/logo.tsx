import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 outline-none" aria-label="GenUI home">
      <span className="relative grid size-7 place-items-center overflow-hidden rounded-[9px] bg-gradient-to-br from-accent-2 via-accent to-accent-3">
        <span className="absolute inset-[1.5px] rounded-[7.5px] bg-bg" />
        <span className="relative size-2.5 rounded-full bg-gradient-to-br from-accent-2 via-accent to-accent-3 transition-transform duration-500 group-hover:scale-150" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">GenUI</span>
    </Link>
  );
}
