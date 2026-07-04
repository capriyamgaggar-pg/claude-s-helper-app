/**
 * Card motion tokens — springs, stagger, and reduced-motion helpers.
 *
 * See .lovable/plan.md — every interactive card, chip, ripple, and motif
 * consumes the same physics from here so the app has one motion voice.
 */
import { useReducedMotion, type Transition } from "motion/react";

/** Spring physics reused across the whole app. */
export const springs = {
  /** Card lift, chip scale — soft, unhurried. */
  gentle: { type: "spring", stiffness: 170, damping: 22, mass: 0.9 },
  /** Pointer tilt & spotlight follow — quick and precise. */
  snappy: { type: "spring", stiffness: 320, damping: 26, mass: 0.6 },
  /** Motif click bursts — playful overshoot. */
  bounce: { type: "spring", stiffness: 400, damping: 12, mass: 0.7 },
  /** Button presses / taps — crisp, no overshoot. */
  press: { type: "spring", stiffness: 500, damping: 30, mass: 0.5 },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof springs;

/** Stagger config for feed entrance. */
export function stagger(itemCount: number): Transition {
  return { staggerChildren: itemCount > 20 ? 0.02 : 0.04, delayChildren: 0.02 };
}

/** Card entrance transform — same values everywhere for consistency. */
export const cardEnter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: "easeOut" } },
} as const;

/**
 * Wrap a motion prop set so that reduced-motion users get opacity-only.
 * Callers use this instead of the raw config so the fallback is uniform.
 */
export function useCardMotion() {
  const reduced = useReducedMotion() ?? false;
  return {
    reduced,
    springs,
    /** Applied to each card in a list. Falls back to opacity-only when reduced. */
    item: reduced
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0, transition: { duration: 0.12 } },
          transition: { duration: 0.18 },
        }
      : {
          ...cardEnter,
          transition: springs.gentle,
        },
    /** Container stagger — no-op when reduced. */
    list: (count: number): Transition =>
      reduced ? { staggerChildren: 0 } : stagger(count),
  };
}
