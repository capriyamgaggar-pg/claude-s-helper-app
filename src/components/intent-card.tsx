import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Users, Clock, ArrowRight } from "lucide-react";
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
import { categoryPhoto } from "@/lib/category-photos";

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
  newResponses?: number;
  totalResponses?: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function IntentCard({ intent }: { intent: IntentCardData }) {
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLAnchorElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spotlightX = useMotionValue(50);
  const spotlightY = useMotionValue(50);

  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [2, -2]), springs.snappy);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-2, 2]), springs.snappy);

  const spotlightBg = useMotionTemplate`radial-gradient(280px circle at ${spotlightX}% ${spotlightY}%, color-mix(in oklab, var(--card-accent) 35%, transparent), transparent 70%)`;

  const pill = intent.status ? statusPill(intent.status, intent.expires_at ?? null) : null;
  const toneClass =
    pill?.tone === "amber"
      ? "bg-amber-100 text-amber-900"
      : pill?.tone === "green"
        ? "bg-emerald-100 text-emerald-900"
        : "bg-white/90 text-foreground";

  const byline = creatorByline(intent.category_slug, intent.creator_visible);
  const showName = intent.creator_visible;
  const initial = showName ? (intent.creator_name?.[0] ?? "·").toUpperCase() : "?";

  const proofLine = intent.interested_count > 0
    ? `${intent.interested_count} interested`
    : "Be the first to show interest";

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
    if (reduced) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = Date.now() + Math.random();
    const ripple: Ripple = { id, x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples((prev) => [...prev, ripple]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }

  return (
    <motion.div layout style={{ perspective: reduced ? undefined : 900 }} className="relative">
      <Link
        ref={rootRef}
        to="/intents/$intentId"
        params={{ intentId: intent.id }}
        onPointerEnter={handleEnter}
        onPointerMove={trackPointer}
        onPointerLeave={handleLeave}
        onPointerDown={handlePointerDown}
        className="group relative block overflow-hidden rounded-3xl border border-border bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--card-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <motion.div
          className="relative"
          style={{
            transformStyle: reduced ? undefined : "preserve-3d",
            rotateX: reduced ? 0 : rotateX,
            rotateY: reduced ? 0 : rotateY,
          }}
          whileHover={reduced ? { y: -2 } : { y: -5 }}
          whileFocus={reduced ? { y: -2 } : { y: -5 }}
          transition={springs.gentle}
        >
          {!reduced && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 opacity-0 mix-blend-soft-light transition-opacity duration-200 group-hover:opacity-100"
              style={{ backgroundImage: spotlightBg }}
            />
          )}

          <span
            aria-hidden
            className="pointer-events-none absolute -inset-px z-10 rounded-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{
              boxShadow:
                "0 0 0 1px color-mix(in oklab, var(--card-accent) 55%, transparent), 0 16px 34px -18px color-mix(in oklab, var(--card-accent) 55%, transparent)",
            }}
          />

          <AnimatePresence>
            {ripples.map((r) => (
              <motion.span
                key={r.id}
                aria-hidden
                className="pointer-events-none absolute z-10 rounded-full"
                style={{
                  left: r.x, top: r.y, width: 8, height: 8,
                  translateX: "-50%", translateY: "-50%",
                  background: "color-mix(in oklab, var(--card-accent) 45%, transparent)",
                }}
                initial={{ scale: 0, opacity: 0.5 }}
                animate={{ scale: 60, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>

          <div className="relative h-40 w-full overflow-hidden bg-muted">
            <motion.img
              src={categoryPhoto(intent.category_slug)}
              alt=""
              className="h-full w-full object-cover"
              animate={reduced ? undefined : { scale: hovered ? 1.05 : 1 }}
              transition={springs.gentle}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />

            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
                {intent.category_label}
              </span>
              {pill && (
                <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm " + toneClass}>
                  <Clock className="size-3" /> {pill.text}
                </span>
              )}
            </div>

            {!!intent.newResponses && intent.newResponses > 0 && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white">
                {intent.totalResponses ?? intent.newResponses} total · {intent.newResponses} left
              </span>
            )}
          </div>

          <div className="relative p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="display text-lg leading-snug text-foreground">{intent.title}</h3>
              <span className="shrink-0 pt-1 text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(intent.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
              {intent.city && (
                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {intent.city}</span>
              )}
              {intent.starts_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {new Date(intent.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              {showName && intent.creator_photo ? (
                <img src={intent.creator_photo} alt="" className="size-6 rounded-full object-cover" />
              ) : (
                <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {initial}
                </span>
              )}
              <span className="text-[12px] text-muted-foreground">
                {showName ? `${byline} ${intent.creator_name ?? "Someone"}` : "Anonymous Creator"}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-foreground px-4 py-3 text-background transition-transform group-hover:scale-[1.01]">
              <span className="flex items-center gap-1.5 text-[13px] font-medium">
                <Users className="size-3.5" />
                {proofLine}
                {isOrganizerCategory(intent.category_slug) ? ` · ${intent.people_needed} max` : ` · ${intent.people_needed} needed`}
              </span>
              <ArrowRight className="size-4 shrink-0" />
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
