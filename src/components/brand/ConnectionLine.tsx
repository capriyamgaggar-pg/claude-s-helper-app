type Props = {
  length?: number;
  className?: string;
  drawClassName?: string;
};

/**
 * Hairline SVG connector. Static by default; pass a drawClassName that
 * animates stroke-dashoffset from 120 → 0 to make it draw.
 */
export function ConnectionLine({ length = 72, className = "", drawClassName = "" }: Props) {
  return (
    <svg
      width={length}
      height={12}
      viewBox={`0 0 ${length} 12`}
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <line
        x1={2}
        y1={6}
        x2={length - 2}
        y2={6}
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        className={`text-foreground/35 ${drawClassName}`}
      />
    </svg>
  );
}
