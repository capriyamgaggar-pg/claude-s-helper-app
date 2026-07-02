import { IntentExampleCard } from "./IntentExampleCard";
import { ConnectionLine } from "./ConnectionLine";
import { PersonAvatar } from "./PersonAvatar";
import type { IntentExample } from "./examples";

type Variant = "full" | "compact";

type Props = {
  examples: IntentExample[];
  variant?: Variant;
  className?: string;
};

const PAIRING_MS = 8000;

// Position table for the "full" variant, keyed by index (mod 3).
// Kept small and declarative so adding examples doesn't need engine changes.
const fullPositions = [
  { className: "left-[4%] top-[10%]", reverse: false },
  { className: "right-[3%] top-[42%]", reverse: true },
  { className: "left-[5%] bottom-[10%]", reverse: false },
];

export function AmbientNetwork({ examples, variant = "full", className = "" }: Props) {
  const totalMs = Math.max(examples.length, 1) * PAIRING_MS;
  const totalS = totalMs / 1000;

  // Percentages for a single pairing's timeline segment within the loop.
  // See the plan: fade-in 500ms, line 900ms, avatar 400ms, hold, fade-out 1000ms.
  const seg = (t: number) => (t / PAIRING_MS) * (100 / examples.length);

  // Build shared keyframes; each pairing offsets via animation-delay.
  const styleBlock = `
    @keyframes an-card {
      0% { opacity: 0; }
      ${seg(500).toFixed(3)}% { opacity: 1; }
      ${seg(7000).toFixed(3)}% { opacity: 1; }
      ${seg(8000).toFixed(3)}% { opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes an-line {
      0% { stroke-dashoffset: 120; }
      ${seg(500).toFixed(3)}% { stroke-dashoffset: 120; }
      ${seg(1400).toFixed(3)}% { stroke-dashoffset: 0; }
      ${seg(7000).toFixed(3)}% { stroke-dashoffset: 0; }
      ${seg(8000).toFixed(3)}% { stroke-dashoffset: 120; }
      100% { stroke-dashoffset: 120; }
    }
    @keyframes an-avatar {
      0% { opacity: 0; transform: scale(0.96); }
      ${seg(1400).toFixed(3)}% { opacity: 0; transform: scale(0.96); }
      ${seg(1800).toFixed(3)}% { opacity: 1; transform: scale(1); }
      ${seg(7000).toFixed(3)}% { opacity: 1; transform: scale(1); }
      ${seg(8000).toFixed(3)}% { opacity: 0; transform: scale(0.98); }
      100% { opacity: 0; transform: scale(0.96); }
    }
    .an-card    { animation: an-card    ${totalS}s cubic-bezier(0.22, 0.61, 0.36, 1) infinite; opacity: 0; }
    .an-line    { stroke-dasharray: 120; stroke-dashoffset: 120; animation: an-line ${totalS}s cubic-bezier(0.22, 0.61, 0.36, 1) infinite; }
    .an-avatar  { animation: an-avatar  ${totalS}s cubic-bezier(0.22, 0.61, 0.36, 1) infinite; opacity: 0; transform-origin: center; }
    @media (prefers-reduced-motion: reduce) {
      .an-card, .an-line, .an-avatar {
        animation: none !important;
      }
      .an-pairing:not(:first-child) { display: none; }
      .an-pairing:first-child .an-card,
      .an-pairing:first-child .an-avatar { opacity: 1 !important; transform: none !important; }
      .an-pairing:first-child .an-line { stroke-dashoffset: 0 !important; }
    }
  `;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Static warm wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 700px at 15% 10%, oklch(0.97 0.02 80 / 0.9), transparent 60%), radial-gradient(900px 600px at 90% 90%, oklch(0.95 0.03 150 / 0.55), transparent 65%)",
        }}
      />

      {/* Static ambient node field */}
      <svg
        className="absolute inset-0 h-full w-full text-foreground"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.10">
          <line x1="80" y1="180" x2="230" y2="260" />
          <line x1="820" y1="140" x2="700" y2="300" />
          <line x1="120" y1="760" x2="280" y2="820" />
          <line x1="720" y1="720" x2="880" y2="820" />
        </g>
        <g fill="currentColor" opacity="0.22">
          {[
            [80, 180, 2.5],
            [230, 260, 2],
            [500, 120, 2],
            [820, 140, 2.5],
            [700, 300, 2],
            [120, 760, 2],
            [280, 820, 2],
            [880, 820, 2.5],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      </svg>

      {/* Staged pairings */}
      {variant === "full" ? (
        <div className="absolute inset-0">
          {examples.map((ex, i) => {
            const pos = fullPositions[i % fullPositions.length];
            const delay = `${(i * PAIRING_MS) / 1000}s`;
            return (
              <div key={i} className={`an-pairing absolute ${pos.className}`}>
                <div
                  className={`flex items-center gap-6 ${pos.reverse ? "flex-row-reverse" : ""}`}
                  style={{ animationDelay: delay }}
                >
                  <div className="an-card" style={{ animationDelay: delay }}>
                    <IntentExampleCard example={ex} />
                  </div>
                  <ConnectionLine drawClassName="an-line" length={72} />
                  <div className="an-avatar" style={{ animationDelay: delay }}>
                    <PersonAvatar initial={ex.avatar} tint={ex.tint} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="absolute inset-x-0 top-6 flex h-24 items-center justify-center">
          <div className="relative h-full w-full">
            {examples.map((ex, i) => {
              const delay = `${(i * PAIRING_MS) / 1000}s`;
              return (
                <div
                  key={i}
                  className="an-pairing absolute inset-0 flex items-center justify-center gap-3"
                >
                  <div className="an-card" style={{ animationDelay: delay }}>
                    <IntentExampleCard example={ex} compact />
                  </div>
                  <ConnectionLine drawClassName="an-line" length={56} />
                  <div className="an-avatar" style={{ animationDelay: delay }}>
                    <PersonAvatar initial={ex.avatar} tint={ex.tint} size={30} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{styleBlock}</style>
    </div>
  );
}
