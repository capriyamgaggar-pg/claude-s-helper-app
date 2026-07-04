/**
 * Motion primitives for the Intent Experience System.
 * See docs/intent-experience-system.md §4.
 *
 * Rules:
 * - Never hard-code durations or easings in components — import from here.
 * - Always call `prefersReducedMotion()` and degrade to `duration.instant`
 *   for users who request reduced motion.
 */

export const motion = {
  duration: {
    instant: 0,
    quick: 140,
    base: 240,
    slow: 380,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    entrance: "cubic-bezier(0, 0, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },

  /** True when the user has asked the OS for reduced motion. SSR-safe. */
  prefersReducedMotion(): boolean {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  /**
   * Build a CSS `transition` value that respects reduced-motion.
   * Example: `style={{ transition: motion.transition("opacity", "quick") }}`
   */
  transition(
    property: string,
    speed: keyof typeof motion.duration = "base",
    easing: keyof typeof motion.easing = "standard",
  ): string {
    const ms = motion.prefersReducedMotion() ? 0 : motion.duration[speed];
    return `${property} ${ms}ms ${motion.easing[easing]}`;
  },
} as const;

export type MotionSpeed = keyof typeof motion.duration;
export type MotionEasing = keyof typeof motion.easing;
