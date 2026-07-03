import { Sparkles } from "lucide-react";

export function PromoCard() {
  return (
    <div
      className="mt-8 flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "color-mix(in oklab, var(--accent-peach) 55%, var(--surface-warm))",
        minHeight: 76,
      }}
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: "color-mix(in oklab, var(--accent-orange) 18%, white)", color: "var(--accent-orange)" }}
      >
        <Sparkles className="size-4" />
      </span>

      <p className="min-w-0 flex-1 text-[13px] leading-snug text-foreground/85">
        Good things happen when good people{" "}
        <span className="font-semibold" style={{ color: "var(--accent-orange)" }}>plan together</span>.
      </p>

      <svg
        className="hidden shrink-0 sm:block"
        width="88"
        height="44"
        viewBox="0 0 88 44"
        fill="none"
        aria-hidden
        style={{ color: "var(--accent-orange)", opacity: 0.55 }}
      >
        <path d="M4 34 L26 14 L38 26 L52 10 L72 30 L84 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="26" cy="14" r="1.6" fill="currentColor" />
        <circle cx="52" cy="10" r="1.6" fill="currentColor" />
        <circle cx="72" cy="30" r="1.6" fill="currentColor" />
        <path d="M70 30 L70 20 L76 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="10" cy="8" r="0.9" fill="currentColor" opacity="0.6" />
        <circle cx="82" cy="8" r="0.9" fill="currentColor" opacity="0.6" />
        <circle cx="46" cy="36" r="0.9" fill="currentColor" opacity="0.6" />
      </svg>
    </div>
  );
}
