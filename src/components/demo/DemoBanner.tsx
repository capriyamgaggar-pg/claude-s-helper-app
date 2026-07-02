import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_PERSONAS,
  DEMO_PERSONA_LABELS,
  currentDemoPersona,
  isDemoHostBrowser,
  signInAsDemoPersona,
  type DemoPersona,
} from "@/lib/demo-client";
import { resetDemo } from "@/lib/demo.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronUp, RefreshCw, LogOut, Users } from "lucide-react";

export function DemoBanner() {
  const [persona, setPersona] = useState<DemoPersona | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isDemoHostBrowser()) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setPersona(currentDemoPersona(data.user));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setPersona(currentDemoPersona(session?.user ?? null));
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!persona || !isDemoHostBrowser()) return null;

  async function switchTo(p: DemoPersona) {
    if (busy) return;
    setBusy(true);
    try {
      await supabase.auth.signOut();
      await signInAsDemoPersona(p);
      window.location.href = "/home";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't switch persona");
      setBusy(false);
    }
  }

  async function onReset() {
    if (busy) return;
    setBusy(true);
    try {
      await resetDemo();
      toast.success("Demo data reset");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
      setBusy(false);
    }
  }

  async function onExit() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  const meta = DEMO_PERSONA_LABELS[persona];

  return (
    <div className="fixed inset-x-0 top-0 z-50 mx-auto max-w-[480px] px-3 pt-2 sm:max-w-[640px]">
      <div className="rounded-xl border border-amber-300/60 bg-amber-50/95 shadow-sm backdrop-blur dark:border-amber-500/30 dark:bg-amber-950/70">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        >
          <span className="flex items-center gap-2 text-[12px] font-medium text-amber-900 dark:text-amber-100">
            <span className="rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[10px] uppercase tracking-widest">
              Preview
            </span>
            Signed in as <strong>{meta.label}</strong>
          </span>
          <ChevronUp
            className={cn(
              "size-4 text-amber-900/70 transition-transform dark:text-amber-100/70",
              open ? "" : "rotate-180",
            )}
          />
        </button>

        {open && (
          <div className="border-t border-amber-300/50 px-3 py-3 dark:border-amber-500/20">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-900/70 dark:text-amber-100/70">
              <Users className="size-3" /> Switch persona
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PERSONAS.map((p) => {
                const active = p === persona;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={busy || active}
                    onClick={() => switchTo(p)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-left text-[12px] transition",
                      active
                        ? "border-amber-600/60 bg-amber-100 dark:bg-amber-900/60"
                        : "border-amber-300/50 bg-white hover:border-amber-500/60 dark:border-amber-500/20 dark:bg-amber-950/40",
                    )}
                  >
                    <div className="font-medium text-foreground">
                      {DEMO_PERSONA_LABELS[p].label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {DEMO_PERSONA_LABELS[p].blurb}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={onReset}
                disabled={busy}
              >
                <RefreshCw className="size-3.5" /> Reset demo data
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={onExit}
                disabled={busy}
              >
                <LogOut className="size-3.5" /> Exit demo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
