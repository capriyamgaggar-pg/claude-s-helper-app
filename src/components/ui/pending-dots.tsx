// Three tiny bouncing dots for "waiting" states. Pure CSS keyframes, no
// animation library needed -- see MOTION_PRINCIPLES.md, Phase 1 does not
// require a new dependency.
export function PendingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle" aria-hidden="true">
      <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="size-1 animate-bounce rounded-full bg-current" />
    </span>
  );
}
