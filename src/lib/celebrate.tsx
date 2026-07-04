/**
 * Celebration motion — reserved for genuinely meaningful firsts.
 * See docs/intent-experience-system.md §8 and .lovable/plan.md Phase 8.
 *
 * Gates:
 *   - Fires at most once per (userId, key) via localStorage.
 *   - Respects prefers-reduced-motion — degrades to a no-op.
 *   - No dependencies — hand-rolled SVG confetti burst.
 *
 * Approved keys ONLY (do not add routine actions here):
 *   - "first-intent-published"
 *   - "first-connection-sent"
 *   - "first-connection-accepted"
 */

import { useEffect, useMemo, useState } from "react";

export type CelebrationKey =
  | "first-intent-published"
  | "first-connection-sent"
  | "first-connection-accepted";

function storageKey(userId: string, key: CelebrationKey): string {
  return `intent.celebrate.${userId}.${key}`;
}

function hasFired(userId: string, key: CelebrationKey): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey(userId, key)) === "1";
  } catch {
    return true;
  }
}

function markFired(userId: string, key: CelebrationKey): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId, key), "1");
  } catch {
    /* ignore */
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fire once, ever, per (user, key). Returns true if it fired now.
 * Safe to call unconditionally after a meaningful success.
 */
export function celebrateOnce(userId: string, key: CelebrationKey): boolean {
  if (!userId) return false;
  if (hasFired(userId, key)) return false;
  markFired(userId, key);
  if (prefersReducedMotion()) return false;
  window.dispatchEvent(new CustomEvent("intent:celebrate", { detail: { key } }));
  return true;
}

// -------- Confetti host (renders in root) --------

interface Piece {
  id: number;
  x: number;
  angle: number;
  distance: number;
  rotate: number;
  delay: number;
  size: number;
  color: string;
}

const CONFETTI_COLORS = [
  "var(--primary)",
  "var(--accent-peach, #f6b26b)",
  "var(--accent-mint, #7cc4a0)",
  "var(--accent-sky, #7aa8d9)",
];

function buildPieces(seed: number): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + (seed % 1);
    pieces.push({
      id: i,
      x: 50, // center %
      angle,
      distance: 80 + Math.random() * 90,
      rotate: (Math.random() - 0.5) * 720,
      delay: Math.random() * 60,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    });
  }
  return pieces;
}

/**
 * Mount ONCE near the root. Listens for celebration events and renders a
 * short-lived confetti burst overlay. Non-interactive.
 */
export function CelebrationHost() {
  const [burst, setBurst] = useState<number | null>(null);

  useEffect(() => {
    function onCelebrate() {
      setBurst(Date.now());
      window.setTimeout(() => setBurst(null), 1400);
    }
    window.addEventListener("intent:celebrate", onCelebrate);
    return () => window.removeEventListener("intent:celebrate", onCelebrate);
  }, []);

  const pieces = useMemo(() => (burst ? buildPieces(burst) : []), [burst]);

  if (!burst) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      <style>{`
        @keyframes intent-confetti {
          0%   { transform: translate(0,0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--r)); opacity: 0; }
        }
      `}</style>
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        {pieces.map((p) => {
          const tx = Math.cos(p.angle) * p.distance;
          const ty = Math.sin(p.angle) * p.distance;
          return (
            <span
              key={p.id}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: `${p.size}px`,
                height: `${p.size * 0.4}px`,
                background: p.color,
                borderRadius: "2px",
                // custom props consumed by keyframe
                ["--tx" as string]: `${tx}px`,
                ["--ty" as string]: `${ty}px`,
                ["--r" as string]: `${p.rotate}deg`,
                animation: `intent-confetti 1200ms cubic-bezier(0.15,0.7,0.25,1) ${p.delay}ms forwards`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
