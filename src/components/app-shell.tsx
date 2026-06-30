import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, MessageCircle, User as UserIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tab = { to: string; label: string; Icon: typeof Home; primary?: boolean };
const tabs: Tab[] = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/explore", label: "Explore", Icon: Compass },
  { to: "/intents/new", label: "Create", Icon: Plus, primary: true },
  { to: "/inbox", label: "Inbox", Icon: MessageCircle },
  { to: "/profile/me", label: "You", Icon: UserIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background pb-[calc(64px+env(safe-area-inset-bottom))] sm:max-w-[640px]">
      <main className="flex-1">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid w-full max-w-[480px] grid-cols-5 sm:max-w-[640px]">
          {tabs.map(({ to, label, Icon, primary }) => {
            const active =
              pathname === to ||
              (to !== "/home" && to !== "/intents/new" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={to as any}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {primary ? (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-ink-foreground shadow-sm">
                    <Icon className="size-5" />
                  </span>
                ) : (
                  <Icon className={cn("size-5", active && "stroke-[2.25]")} />
                )}
                {!primary && <span>{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
