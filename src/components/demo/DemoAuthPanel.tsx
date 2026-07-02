import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DEMO_PERSONAS,
  DEMO_PERSONA_LABELS,
  isDemoHostBrowser,
  signInAsDemoPersona,
  type DemoPersona,
} from "@/lib/demo-client";
import { initializeDemo } from "@/lib/demo.functions";
import { Loader2, Sparkles } from "lucide-react";

export function DemoAuthPanel() {
  const navigate = useNavigate();
  const [initializing, setInitializing] = useState(false);
  const [busy, setBusy] = useState<DemoPersona | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (!isDemoHostBrowser()) return null;

  async function onInit() {
    setInitializing(true);
    try {
      await initializeDemo();
      setInitialized(true);
      toast.success("Demo environment ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to initialize demo");
    } finally {
      setInitializing(false);
    }
  }

  async function onPersona(p: DemoPersona) {
    setBusy(p);
    try {
      await signInAsDemoPersona(p);
      navigate({ to: "/home", replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign-in failed";
      if (/user|not.*found|invalid/i.test(msg)) {
        toast.error("Run 'Initialize demo environment' first.");
      } else {
        toast.error(msg);
      }
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-amber-400/50 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-950/30">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-amber-900">
          Preview
        </span>
        <span className="text-[12px] text-foreground/70">One-tap demo accounts</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DEMO_PERSONAS.map((p) => (
          <Button
            key={p}
            variant="outline"
            size="sm"
            className="h-auto flex-col items-start gap-0.5 rounded-lg border-amber-300/60 bg-white/70 px-3 py-2 text-left dark:bg-amber-950/40"
            onClick={() => onPersona(p)}
            disabled={busy !== null || initializing}
          >
            <span className="flex w-full items-center justify-between text-[12px] font-medium text-foreground">
              {DEMO_PERSONA_LABELS[p].label}
              {busy === p && <Loader2 className="size-3 animate-spin" />}
            </span>
            <span className="text-[10.5px] font-normal leading-tight text-muted-foreground">
              {DEMO_PERSONA_LABELS[p].blurb}
            </span>
          </Button>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3 w-full gap-1.5 text-[12px] text-amber-900/80 hover:text-amber-900 dark:text-amber-100/80"
        onClick={onInit}
        disabled={initializing}
      >
        {initializing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {initialized ? "Re-initialize demo data" : "Initialize demo environment"}
      </Button>
    </div>
  );
}
