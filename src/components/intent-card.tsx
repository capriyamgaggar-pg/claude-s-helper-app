import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { statusPill, type IntentStatus } from "@/lib/intent-lifecycle";
import { creatorByline, isOrganizerCategory } from "@/lib/creator-visibility";
import { springs } from "@/lib/card-motion";
import { MotifTile } from "@/components/motifs/motif-tile";

export interface IntentCardData {
  id: string;
  title: string;
  category_slug: string;
  category_label: string;
  city: string | null;
  starts_at: string | null;
  people_needed: number;
  interested_count: number;
  creator_name: string | null;
  creator_photo: string | null;
  creator_visible: boolean;
  created_at: string;
  status?: IntentStatus | string;
  expires_at?: string | null;
  /** Count of registration responses still awaiting a decision (My Intents only). */
  newResponses?: number;
  /** Total responses ever received for this intent (My Intents only). */
  totalResponses?: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/**
 * Interactive intent card — see .lovable/plan.md § "PR 1 — Interaction system".
 *
 * Interactions layered here:
 *  - `layout` prop → smooth reorder inside AnimatePresence-wrapped feeds
 *  - hover lift (`whileHover`), border glow ring, chip scale
 *  - pointer tilt + spotlight driven by MotionValues (zero React re-renders)
 *  - pointer-anchored click ripple; navigation is never blocked
 *  - motif tile carries a shared `layoutId` so Explore → Detail can morph
 *
 * All effects degrade to opacity-only under `prefers-reduced-motion`.
 */
export function IntentCard({ intent }: { intent: IntentCardData }) {
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLAnchorElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Raw pointer position (normalised -0.5 → 0.5 across the card).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  // Spotlight position in %.
  const spotlightX = useMotionValue(50);
  const spotlightY = useMotionValue(50);

  // Springs make the tilt feel like it has weight without triggering renders.
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [3, -3]), springs.snappy);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-3, 3]), springs.snappy);

  const spotlightBg = useMotionTemplate`radial-gradient(240px circle at ${spotlightX}% ${spotlightY}%, color-mix(in oklab, var(--card-accent) 45%, transparent), transparent 70%)`;

  const pill = intent.status ? statusPill(intent.status, intent.expires_at ?? null) : null;
  const toneClass =
    pill?.tone === "amber"
      ? "bg-amber-100 text-amber-900"
      : pill?.tone === "green"
        ? "bg-emerald-100 text-emerald-900"
        : pill?.tone === "grey"
          ? "bg-muted text-muted-foreground"
          : "bg-secondary text-muted-foreground";

  const byline = creatorByline(intent.category_slug, intent.creator_visible);
  const showName = intent.creator_visible;
  const initial = showName
    ? (intent.creator_name?.[0] ?? "·").toUpperCase()
    : "?";

  function trackPointer(e: ReactPointerEvent<HTMLAnchorElement>) {
    if (reduced || e.pointerType === "touch") return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    px.set(relX - 0.5);
    py.set(relY - 0.5);
    spotlightX.set(relX * 100);
    spotlightY.set(relY * 100);
  }

  function handleEnter(e: ReactPointerEvent<HTMLAnchorElement>) {
    setHovered(true);
    trackPointer(e);
  }

  function handleLeave() {
    setHovered(false);
    px.set(0);
    py.set(0);
    spotlightX.set(50);
    spotlightY.set(50);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLAnchorElement>) {
    // Navigation happens on the anchor's own click — this only paints a
    // ripple. We never call preventDefault / stopPropagation here.
    if (reduced) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = Date.now() + Math.random();
    const ripple: Ripple = {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setRipples((prev) => [...prev, ripple]);
    // Auto-cleanup after the animation window so state doesn't leak.
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }

  return (
    <motion.div
      layout
      style={{ perspective: reduced ? undefined : 900 }}
      className="relative"
    >
      <Link
        ref={rootRef}
        to="/intents/$intentId"
        params={{ intentId: intent.id }}
        onPointerEnter={handleEnter}
        onPointerMove={trackPointer}
        onPointerLeave={handleLeave}
        onPointerDown={handlePointerDown}
        className="group relative block rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-secondary/40"
      >
        <motion.div
          className="relative flex gap-3"
          style={{
            transformStyle: reduced ? undefined : "preserve-3d",
            rotateX: reduced ? 0 : rotateX,
            rotateY: reduced ? 0 : rotateY,
          }}
          whileHover={reduced ? undefined : { y: -4, scale: 1.005 }}
          transition={springs.gentle}
        >
          {/* Spotlight — pointer-tracked accent wash. */}
          {!reduced && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 mix-blend-soft-light transition-opacity duration-200 group-hover:opacity-100"
              style={{ backgroundImage: spotlightBg }}
            />
          )}

          {/* Border glow ring — pre-composited, opacity only. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{
              boxShadow:
                "0 0 0 1px color-mix(in oklab, var(--card-accent) 55%, transparent), 0 12px 30px -18px color-mix(in oklab, var(--card-accent) 60%, transparent)",
            }}
          />

          {/* Ripples — pointer-anchored, fire-and-forget. */}
          <AnimatePresence>
            {ripples.map((r) => (
              <motion.span
                key={r.id}
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                  left: r.x,
                  top: r.y,
                  width: 8,
                  height: 8,
                  translateX: "-50%",
                  translateY: "-50%",
                  background: "color-mix(in oklab, var(--card-accent) 45%, transparent)",
                }}
                initial={{ scale: 0, opacity: 0.5 }}
                animate={{ scale: 40, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>

          {/* Motif tile — carries the shared layoutId for card→detail morph. */}
          <div className="relative shrink-0">
            <MotifTile
              slug={intent.category_slug}
              hovered={hovered}
              layoutId={`motif-${intent.id}`}
            />
          </div>

          {/* Card body */}
          <div className="relative min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <motion.span
                className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                whileHover={reduced ? undefined : { scale: 1.04 }}
                transition={springs.gentle}
              >
                {intent.category_label}
              </motion.span>
              {pill && (
                <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " + toneClass}>
                  <Clock className="size-3" /> {pill.text}
                </span>
              )}
              {!!intent.newResponses && intent.newResponses > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-medium text-white">
                  {intent.totalResponses ?? intent.newResponses} total · {intent.newResponses} left
                </span>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(intent.created_at), { addSuffix: true })}
              </span>
            </div>

            <h3 className="display mt-2 text-lg leading-snug text-foreground">{intent.title}</h3>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
              {intent.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> {intent.city}
                </span>
              )}
              {intent.starts_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {new Date(intent.starts_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {intent.interested_count} interested
                {isOrganizerCategory(intent.category_slug)
                  ? ` · ${intent.people_needed} max`
                  : ` · ${intent.people_needed} needed`}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 pt-1">
              {showName && intent.creator_photo ? (
                <img
                  src={intent.creator_photo}
                  alt=""
                  className="size-6 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {initial}
                </span>
              )}
              <span className="text-[12px] text-muted-foreground">
                {showName
                  ? `${byline} ${intent.creator_name ?? "Someone"}`
                  : "Anonymous Creator"}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
