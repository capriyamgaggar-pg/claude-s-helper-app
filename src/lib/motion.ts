/**
 * Motion primitives for the Intent Experience System.
 * See docs/intent-experience-system.md §4.
 *
 * Rules:
 * - Never hard-code durations or easings in components — import from here.
 * - Always call `prefersReducedMotion()` and degrade to `duration.instant`
 *   for users who request reduced motion.
 */

const DURATION = {
  instant: 0,
  quick: 140,
  base: 240,
  slow: 380,
} as const;

const EASING = {
  standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  entrance: "cubic-bezier(0, 0, 0.2, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export type MotionSpeed = keyof typeof DURATION;
export type MotionEasing = keyof typeof EASING;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function transition(
  property: string,
  speed: MotionSpeed = "base",
  easing: MotionEasing = "standard",
): string {
  const ms = prefersReducedMotion() ? 0 : DURATION[speed];
  return `${property} ${ms}ms ${EASING[easing]}`;
}

export const motion = {
  duration: DURATION,
  easing: EASING,
  prefersReducedMotion,
  transition,
} as const;
