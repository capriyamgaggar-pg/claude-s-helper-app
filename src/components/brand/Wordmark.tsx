type Props = {
  size?: "sm" | "md" | "lg";
  tagline?: string;
};

const sizeMap = {
  sm: "text-[24px]",
  md: "text-[32px]",
  lg: "text-[44px]",
};

const dotSizeMap = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2 w-2",
};

export function Wordmark({ size = "lg", tagline }: Props) {
  return (
    <div>
      <div className="flex items-baseline">
        <span
          className={`${sizeMap[size]} font-medium leading-none tracking-[-0.02em] text-foreground`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Intent
        </span>
      </div>
      {tagline ? (
        <div className="mt-4 flex items-center gap-3">
          <span className="h-px w-8 bg-foreground/20" />
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {tagline}
          </span>
        </div>
      ) : null}
      <style>{`
        @keyframes intent-wordmark-pulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        .intent-wordmark-dot { animation: intent-wordmark-pulse 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .intent-wordmark-dot { animation: none; opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
