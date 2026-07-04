import { motion } from "motion/react";
import {
  Bike,
  Music,
  Users,
  Mountain,
  Home,
  Plane,
  PartyPopper,
  BookOpen,
  Rocket,
  ShoppingBag,
  Sparkles,
  Compass,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  sports: Bike,
  hobby: Music,
  networking: Users,
  trekking: Mountain,
  flatmate: Home,
  travel: Plane,
  event: PartyPopper,
  study: BookOpen,
  cofounder: Rocket,
  shopping: ShoppingBag,
  other: Sparkles,
};

export interface MotifTileProps {
  slug: string;
  /** Passed by IntentCard so PR 2 motifs can react to card hover / press. */
  hovered?: boolean;
  active?: boolean;
  /** Stable id so shared layout morph (card → detail hero) works. */
  layoutId?: string;
  size?: number;
}

/**
 * 56px rounded gradient tile with a category glyph inside.
 *
 * PR 1 renders a Lucide icon on the neutral `--motif-fallback` gradient.
 * PR 2 will swap in bespoke SVG motifs via the same layoutId for a
 * smooth morph — the container stays put.
 */
export function MotifTile({ slug, layoutId, size = 56 }: MotifTileProps) {
  const Icon = ICONS[slug] ?? Compass;
  return (
    <motion.div
      layoutId={layoutId}
      className="relative shrink-0 overflow-hidden rounded-2xl"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, var(--motif-fallback-a), var(--motif-fallback-b))",
        boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--foreground) 6%, transparent)",
      }}
      aria-hidden
    >
      <div className="absolute inset-0 grid place-items-center">
        <Icon
          className="text-foreground/80"
          strokeWidth={1.75}
          size={Math.round(size * 0.42)}
        />
      </div>
    </motion.div>
  );
}
