import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  /** Where to go if there's no real history to go back to (e.g. a shared link opened fresh). */
  fallback: string;
  className?: string;
  children?: ReactNode;
}

/**
 * "Back" should return to wherever the person actually came from -- Home,
 * Explore, a chat, a profile, Responses, wherever. A hardcoded destination
 * link only works for the one entry path it was written for and silently
 * breaks for every other one (e.g. opening an intent from Responses, then
 * hitting back and landing on Home instead of Responses).
 */
export function BackButton({ fallback, className, children }: Props) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: fallback });
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Back"
      className={className ?? "grid size-9 place-items-center rounded-full hover:bg-secondary"}
    >
      {children ?? <ChevronLeft className="size-5" />}
    </button>
  );
}
