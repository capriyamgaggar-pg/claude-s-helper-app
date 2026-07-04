import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Shared empty-state pattern for every list, feed, and inbox.
 * See docs/intent-experience-system.md §5.
 *
 * An empty state is an invitation, not an error. It always contains:
 *   1. A calm illustration or icon
 *   2. A one-line title (Fraunces)
 *   3. A one-sentence body (Inter)
 *   4. At most one primary action
 */
export interface EmptyStateProps {
  /** Icon or illustration node — pass a lucide icon or custom svg. */
  icon?: ReactNode;
  /** Short, plain title. Named as a noun phrase — never an error. */
  title: string;
  /** One sentence that tells the user what to do next. */
  description?: string;
  /** Optional single call-to-action. Prefer none over two. */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Optional secondary content (e.g. a subtle link). Use sparingly. */
  footer?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  footer,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "px-6 py-12 gap-4 rounded-2xl",
        "bg-[color:var(--surface-warm)]/60 border border-border/60",
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--accent-peach)]/50 text-foreground/70"
        >
          {icon}
        </div>
      ) : null}

      <div className="space-y-1.5 max-w-sm">
        <h2 className="display text-xl leading-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        action.href ? (
          <Button asChild size="sm">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}

      {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
