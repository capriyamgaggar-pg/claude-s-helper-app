import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  defaultIntentExamples,
  PREVIEW_STAGES,
  type IntentExample,
  type PreviewStage,
} from "@/components/brand/examples";

export type EmptyFeedPreview = {
  /** Pin to a specific example by slug (defaults to auto-rotating). */
  exampleKey?: string;
  /** Force reduced-motion composed state. */
  reducedMotion?: boolean;
  /** When false, freeze on the fully composed state instead of rotating. */
  previewAutoRotate?: boolean;
  /** Pin to a specific animation stage (highest precedence). */
  previewStage?: PreviewStage;
  /** Bumping this key restarts the animation timeline. */
  replayKey?: number;
};

type Props = {
  label: string;
  interests?: string[] | null;
  onReset: () => void;
  preview?: EmptyFeedPreview;
};

// ─────────────────────────── Suggestions ────────────────────────────

const SUGGESTIONS: Record<string, { emoji: string; label: string }[]> = {
  trekking: [
    { emoji: "🌄", label: "Weekend Trek" },
    { emoji: "🏕", label: "Camping" },
    { emoji: "🥾", label: "Morning Hike" },
  ],
  travel: [
    { emoji: "✈", label: "Weekend Trip" },
    { emoji: "🚗", label: "Road Trip" },
    { emoji: "🌅", label: "Sunrise Drive" },
  ],
  startups: [
    { emoji: "🚀", label: "Looking for Co-founder" },
    { emoji: "☕", label: "Founder Meetup" },
    { emoji: "💡", label: "Startup Brainstorm" },
  ],
  sports: [
    { emoji: "⚽", label: "Football" },
    { emoji: "🏃", label: "Evening Run" },
    { emoji: "🏸", label: "Badminton" },
  ],
  photography: [
    { emoji: "📷", label: "Photo Walk" },
    { emoji: "🌇", label: "Sunset Shoot" },
    { emoji: "🌿", label: "Nature Photography" },
  ],
};

const FALLBACK = [
  { emoji: "☕", label: "Coffee & Work" },
  { emoji: "📚", label: "Study Together" },
  { emoji: "🎲", label: "Board Games" },
  { emoji: "🚴", label: "Weekend Ride" },
];

function getSuggestionsForInterests(interests?: string[] | null) {
  const chips: { emoji: string; label: string }[] = [];
  const seen = new Set<string>();
  const add = (arr: typeof FALLBACK) => {
    for (const c of arr) {
      if (chips.length >= 4) return;
      if (seen.has(c.label)) continue;
      seen.add(c.label);
      chips.push(c);
    }
  };
  for (const i of interests ?? []) {
    const key = i.toLowerCase();
    if (SUGGESTIONS[key]) add(SUGGESTIONS[key]);
    if (chips.length >= 4) break;
  }
  if (chips.length < 4) add(FALLBACK);
  return chips.slice(0, 4);
}

// ─────────────────────────── Animation ────────────────────────────

// Stages (ms per stage)
//  0 card fade in (first loop only, then skipped)
//  1 emoji shimmer
//  2 ripple + node awakening
//  3 dot growing at avatar slots
//  4 outline circle
//  5 silhouette
//  6 curved connection lines settle
//  7 "Connected" tag appears
//  8 hold
//  9 morph card content → next example, network fades back to sleep
const STAGE_DUR = [600, 700, 1300, 500, 400, 500, 500, 1400, 800, 1000];

// Cluster geometry (SVG viewBox 400×220). Card sits at (200, 110).
const CARD_X = 200;
const CARD_Y = 110;

const NODES: { x: number; y: number }[] = [
  { x: 60, y: 40 },
  { x: 200, y: 22 },
  { x: 340, y: 40 },
  { x: 60, y: 200 },
  { x: 340, y: 200 },
  { x: 200, y: 205 },
  { x: 90, y: 130 },  // avatar left slot (index 6)
  { x: 310, y: 130 }, // avatar right slot (index 7)
];
const AVATAR_LEFT_IDX = 6;
const AVATAR_RIGHT_IDX = 7;

// Faint segments that already exist between sleeping nodes.
const SEGMENTS: [number, number][] = [
  [0, 1], [1, 2], [3, 5], [5, 4], [0, 6], [2, 7], [6, 3], [7, 4],
];

export function EmptyFeed({ label, interests, onReset, preview }: Props) {
  const chips = useMemo(() => getSuggestionsForInterests(interests), [interests]);

  const pinnedIndex = useMemo(() => {
    if (!preview?.exampleKey) return null;
    const i = defaultIntentExamples.findIndex((e) => e.slug === preview.exampleKey);
    return i >= 0 ? i : null;
  }, [preview?.exampleKey]);

  const pinnedStage = useMemo(() => {
    if (!preview?.previewStage) return null;
    const i = PREVIEW_STAGES.indexOf(preview.previewStage);
    return i >= 0 ? i : null;
  }, [preview?.previewStage]);

  const autoRotate = preview?.previewAutoRotate ?? true;

  const [exampleIndex, setExampleIndex] = useState(pinnedIndex ?? 0);
  const [stage, setStage] = useState(pinnedStage ?? 0);
  const [rippleOffset, setRippleOffset] = useState({ x: 0, y: 0 });
  const timerRef = useRef<number | null>(null);

  const systemReduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const prefersReduced = preview?.reducedMotion ?? systemReduced;

  // Sync when pinned values change
  useEffect(() => {
    if (pinnedIndex !== null) setExampleIndex(pinnedIndex);
  }, [pinnedIndex]);
  useEffect(() => {
    if (pinnedStage !== null) setStage(pinnedStage);
  }, [pinnedStage]);

  useEffect(() => {
    if (prefersReduced) return;
    if (pinnedStage !== null) return; // don't animate when stage is pinned

    let cancelled = false;

    const tick = (s: number) => {
      if (cancelled) return;
      setStage(s);
      const dur = STAGE_DUR[s];
      timerRef.current = window.setTimeout(() => {
        if (s + 1 >= STAGE_DUR.length) {
          if (autoRotate && pinnedIndex === null) {
            setExampleIndex((i) => (i + 1) % defaultIntentExamples.length);
          }
          setRippleOffset({
            x: (Math.random() - 0.5) * 12,
            y: (Math.random() - 0.5) * 12,
          });
          tick(1);
        } else {
          tick(s + 1);
        }
      }, dur);
    };
    tick(0);
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [prefersReduced, pinnedStage, autoRotate, pinnedIndex, preview?.replayKey]);

  const example = defaultIntentExamples[exampleIndex];
  const nextExample =
    defaultIntentExamples[(exampleIndex + 1) % defaultIntentExamples.length];
  const avatarCount: 1 | 2 =
    example.avatarCount ?? (example.interested > 10 ? 2 : 1);
  const avatarIndices =
    avatarCount === 1 ? [AVATAR_LEFT_IDX] : [AVATAR_LEFT_IDX, AVATAR_RIGHT_IDX];

  const forceComposed = prefersReduced;

  const cardVisible = forceComposed || stage >= 1;
  const rippleActive = !forceComposed && stage === 2;
  const nodesAwake = forceComposed || (stage >= 2 && stage <= 8);
  const avatarStep = forceComposed
    ? 3
    : stage <= 2
    ? 0
    : stage === 3
    ? 1
    : stage === 4
    ? 2
    : stage >= 5 && stage <= 8
    ? 3
    : 0;
  const linesVisible = forceComposed || (stage >= 6 && stage <= 8);
  const connectedVisible = forceComposed || (stage >= 7 && stage <= 8);
  const morphing = !forceComposed && stage === 9;
  const shimmerActive = !forceComposed && stage === 1;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/60 px-5 py-8 sm:px-8 sm:py-10">
      {/* faint warm wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          background:
            "radial-gradient(600px 320px at 30% 20%, oklch(0.95 0.04 80 / 0.9), transparent 60%), radial-gradient(500px 300px at 80% 90%, oklch(0.93 0.05 200 / 0.6), transparent 65%)",
        }}
      />

      {/* animated hero cluster */}
      <div className="relative mx-auto w-full" style={{ maxWidth: 420 }}>
        <div className="relative" style={{ aspectRatio: "400 / 220" }}>
          <svg
            viewBox="0 0 400 220"
            className="absolute inset-0 h-full w-full text-foreground"
            aria-hidden
          >
            {/* pre-connected faint segments */}
            <g stroke="currentColor" strokeWidth="0.6" strokeLinecap="round">
              {SEGMENTS.map(([a, b], i) => {
                const na = NODES[a];
                const nb = NODES[b];
                return (
                  <line
                    key={i}
                    x1={na.x}
                    y1={na.y}
                    x2={nb.x}
                    y2={nb.y}
                    style={{
                      opacity: nodesAwake ? 0.22 : 0.05,
                      transition: "opacity 900ms ease-out",
                    }}
                  />
                );
              })}
            </g>

            {/* nodes */}
            <g fill="currentColor">
              {NODES.map((n, i) => {
                const isAvatarSlot = avatarIndices.includes(i);
                let opacity = nodesAwake ? 0.55 : 0.08;
                let r = 2.5;
                if (isAvatarSlot) {
                  if (avatarStep === 1) {
                    r = 4;
                    opacity = 0.85;
                  } else if (avatarStep >= 2) {
                    opacity = 0; // silhouette takes over
                  }
                }
                return (
                  <circle
                    key={i}
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    style={{
                      opacity,
                      transition:
                        "opacity 700ms ease-out, r 300ms ease-out",
                    }}
                  />
                );
              })}
            </g>

            {/* ripple */}
            {rippleActive && (
              <circle
                key={`ripple-${exampleIndex}`}
                cx={CARD_X + rippleOffset.x}
                cy={CARD_Y + rippleOffset.y}
                r={22}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                className="empty-ripple text-foreground/60"
              />
            )}

            {/* curved connection lines */}
            {avatarIndices.map((idx) => {
              const n = NODES[idx];
              const midX = (CARD_X + n.x) / 2;
              const midY = (CARD_Y + n.y) / 2 - 6;
              return (
                <path
                  key={`ln-${idx}`}
                  d={`M ${n.x} ${n.y} Q ${midX} ${midY} ${CARD_X} ${CARD_Y}`}
                  stroke="currentColor"
                  strokeWidth={0.9}
                  fill="none"
                  strokeLinecap="round"
                  style={{
                    opacity: linesVisible ? 0.4 : 0,
                    transition: "opacity 500ms ease-out",
                  }}
                />
              );
            })}

            {/* silhouettes at avatar slots */}
            {avatarIndices.map((idx) => {
              const n = NODES[idx];
              const showOutline = avatarStep >= 2;
              const showFill = avatarStep >= 3;
              return (
                <g
                  key={`av-${idx}`}
                  transform={`translate(${n.x - 14}, ${n.y - 14})`}
                  style={{
                    opacity: showOutline ? 1 : 0,
                    transition: "opacity 300ms ease-out",
                  }}
                >
                  <circle
                    cx={14}
                    cy={14}
                    r={12}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={0.8}
                    opacity={0.5}
                  />
                  <g
                    style={{
                      opacity: showFill ? 1 : 0,
                      transition: "opacity 350ms ease-out",
                    }}
                  >
                    <circle cx={14} cy={11} r={4} fill="currentColor" opacity={0.55} />
                    <path
                      d="M4 26 Q4 17 14 17 Q24 17 24 26 Z"
                      fill="currentColor"
                      opacity={0.55}
                    />
                  </g>
                </g>
              );
            })}
          </svg>

          {/* card overlay */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              opacity: cardVisible ? 1 : 0,
              transition: "opacity 600ms ease-out",
            }}
          >
            <div className="empty-card-breathe">
              <CardBlock
                example={example}
                nextExample={nextExample}
                morphing={morphing}
                connectedVisible={connectedVisible}
                shimmerActive={shimmerActive}
                shimmerKey={exampleIndex}
              />
            </div>
          </div>
        </div>
      </div>

      {/* headline + body */}
      <div className="relative mt-8 text-center">
        <h3 className="display text-2xl leading-tight sm:text-3xl">Start something.</h3>
        <div className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          <p>One intent can lead to</p>
          <ul className="mt-1 space-y-0.5">
            <li>your next flatmate.</li>
            <li>your next co-founder.</li>
            <li>your next mentor.</li>
            <li>your next community.</li>
          </ul>
        </div>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Link
            to="/intents/new"
            className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Post an Intent
          </Link>
          {label !== "Anywhere" && (
            <button
              type="button"
              onClick={onReset}
              className="text-[13px] text-muted-foreground underline-offset-4 hover:underline"
            >
              Explore Anywhere
            </button>
          )}
        </div>
      </div>

      {/* chips */}
      <div className="relative mt-10">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Start with…
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <Link
              key={c.label}
              to="/intents/new"
              search={{ title: c.label }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-[13px] text-foreground/80 hover:bg-secondary"
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .empty-card-breathe {
          animation: empty-breathe 7.5s ease-in-out infinite;
        }
        @keyframes empty-breathe {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1px); }
        }
        .empty-ripple {
          transform-origin: center;
          transform-box: fill-box;
          animation: empty-ripple-anim 1300ms ease-out forwards;
        }
        @keyframes empty-ripple-anim {
          0%   { opacity: 0.5;  stroke-width: 1.2; transform: scale(0.6)  scaleY(0.98); }
          70%  { opacity: 0.18; stroke-width: 0.6; transform: scale(3.4)  scaleY(1.02); }
          100% { opacity: 0;    stroke-width: 0.3; transform: scale(4.2)  scaleY(1.02); }
        }
        .empty-shimmer {
          position: relative;
          display: inline-block;
          overflow: hidden;
        }
        .empty-shimmer::after {
          content: "";
          position: absolute;
          inset: -3px -6px;
          pointer-events: none;
          background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
          mix-blend-mode: overlay;
          transform: translateX(-140%);
          animation: empty-shimmer-anim 700ms ease-out forwards;
        }
        @keyframes empty-shimmer-anim {
          from { transform: translateX(-140%); }
          to   { transform: translateX(160%); }
        }
        @keyframes empty-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .empty-card-breathe,
          .empty-ripple,
          .empty-shimmer::after {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function CardBlock({
  example,
  nextExample,
  morphing,
  connectedVisible,
  shimmerActive,
  shimmerKey,
}: {
  example: IntentExample;
  nextExample: IntentExample;
  morphing: boolean;
  connectedVisible: boolean;
  shimmerActive: boolean;
  shimmerKey: number;
}) {
  return (
    <div className="min-w-[210px] rounded-2xl border border-foreground/10 bg-surface px-4 py-3 shadow-[0_10px_36px_-24px_rgba(20,20,40,0.25)]">
      <div className="relative">
        <div
          className="flex items-center gap-2"
          style={{
            opacity: morphing ? 0 : 1,
            transition: "opacity 700ms ease-in-out",
          }}
        >
          <span className="text-[16px] leading-none">
            {shimmerActive ? (
              <span key={`shim-${shimmerKey}`} className="empty-shimmer">
                {example.emoji}
              </span>
            ) : (
              <span>{example.emoji}</span>
            )}
          </span>
          <span className="text-[13px] font-medium text-foreground/85">
            {example.title}
          </span>
        </div>
        {morphing && (
          <div
            className="absolute inset-0 flex items-center gap-2"
            style={{ opacity: 0, animation: "empty-fadein 700ms ease-in-out forwards" }}
          >
            <span className="text-[16px] leading-none">{nextExample.emoji}</span>
            <span className="text-[13px] font-medium text-foreground/85">
              {nextExample.title}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 min-h-[14px] text-[10px] uppercase tracking-[0.14em] text-foreground/40">
        <span
          style={{
            opacity: connectedVisible ? 1 : 0,
            transition: "opacity 400ms ease-out",
            color: connectedVisible ? "oklch(0.62 0.14 155)" : undefined,
          }}
        >
          Connected
        </span>
      </div>
    </div>
  );
}
