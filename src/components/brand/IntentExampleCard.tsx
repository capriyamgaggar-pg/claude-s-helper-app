import type { IntentExample } from "./examples";

type Props = {
  example: IntentExample;
  compact?: boolean;
  className?: string;
};

export function IntentExampleCard({ example, compact = false, className = "" }: Props) {
  const titleSize = compact ? "text-[12.5px]" : "text-[13px]";
  const captionSize = compact ? "text-[9.5px]" : "text-[10px]";
  return (
    <div
      className={`rounded-xl border border-foreground/8 bg-surface px-3.5 py-2.5 shadow-[0_8px_28px_-20px_rgba(20,20,40,0.22)] ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[15px] leading-none">{example.emoji}</span>
        <span className={`${titleSize} font-medium text-foreground/85`}>{example.title}</span>
      </div>
      <div className={`mt-1 ${captionSize} uppercase tracking-[0.14em] text-foreground/40`}>
        {example.interested} interested
      </div>
    </div>
  );
}
