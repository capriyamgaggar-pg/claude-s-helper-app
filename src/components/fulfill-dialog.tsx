import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CLOSURE_REASONS, type ClosureReasonCode } from "@/lib/intent-lifecycle";

interface Helper {
  user_id: string;
  name: string | null;
  photo_url: string | null;
}

interface Props {
  intentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

type Step = "ask" | "yes" | "no";

export function FulfillDialog({ intentId, open, onOpenChange, onDone }: Props) {
  const [step, setStep] = useState<Step>("ask");
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [code, setCode] = useState<ClosureReasonCode | null>(null);
  const [closureNote, setClosureNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("ask");
    setPicked(new Set());
    setNote("");
    setCode(null);
    setClosureNote("");
    // Load potential helpers: this intent's participants
    supabase
      .from("intent_participants")
      .select("user_id, profiles(name, photo_url)")
      .eq("intent_id", intentId)
      .then(({ data }) => {
        const list = (data ?? [])
          .map((p) => {
            const prof = (p as { profiles: { name: string | null; photo_url: string | null } | null }).profiles;
            return {
              user_id: (p as { user_id: string }).user_id,
              name: prof?.name ?? null,
              photo_url: prof?.photo_url ?? null,
            };
          });
        setHelpers(list);
      });
  }, [open, intentId]);

  function toggle(uid: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  async function submitYes() {
    setBusy(true);
    const { error } = await supabase
      .from("intents")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        fulfilled_note: note.trim() || null,
      })
      .eq("id", intentId);
    if (error) { setBusy(false); toast.error(error.message); return; }
    if (picked.size > 0) {
      const rows = Array.from(picked).map((uid) => ({ intent_id: intentId, user_id: uid }));
      await supabase.from("intent_fulfillments").upsert(rows, { onConflict: "intent_id,user_id" });
    }
    setBusy(false);
    toast.success("Marked as fulfilled");
    onOpenChange(false);
    onDone();
  }

  async function submitNo() {
    setBusy(true);
    const { error } = await supabase
      .from("intents")
      .update({
        status: "closed",
        closure_reason_code: code,
        closure_reason_note: closureNote.trim() || null,
      })
      .eq("id", intentId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Intent closed");
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "ask" && (
          <>
            <DialogHeader>
              <DialogTitle>Has your intent been fulfilled?</DialogTitle>
              <DialogDescription>
                Closing it removes the intent from discovery. Your chats stay.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2">
              <Button className="h-12 rounded-xl" onClick={() => setStep("yes")}>
                ✅ Yes, I found what I needed
              </Button>
              <Button variant="outline" className="h-12 rounded-xl" onClick={() => setStep("no")}>
                ❌ No, just closing it
              </Button>
            </div>
          </>
        )}

        {step === "yes" && (
          <>
            <DialogHeader>
              <DialogTitle>Who helped fulfill this? (optional)</DialogTitle>
              <DialogDescription>
                Skip if you'd rather not credit anyone.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {helpers.length === 0 && (
                <p className="text-sm text-muted-foreground">No participants yet.</p>
              )}
              {helpers.map((h) => {
                const on = picked.has(h.user_id);
                return (
                  <button
                    key={h.user_id}
                    type="button"
                    onClick={() => toggle(h.user_id)}
                    className={
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left " +
                      (on ? "border-foreground bg-secondary" : "border-border bg-surface hover:bg-secondary/60")
                    }
                  >
                    {h.photo_url ? (
                      <img src={h.photo_url} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-muted text-[11px] font-semibold">
                        {(h.name?.[0] ?? "·").toUpperCase()}
                      </span>
                    )}
                    <span className="flex-1 truncate text-sm">{h.name ?? "Someone"}</span>
                    {on && <span className="text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl bg-surface"
              placeholder="Optional note — e.g. Found a flatmate through Intent."
            />
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setStep("ask")} disabled={busy}>Back</Button>
              <Button onClick={submitYes} disabled={busy}>
                {busy ? "Saving…" : "Mark as fulfilled"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "no" && (
          <>
            <DialogHeader>
              <DialogTitle>Why are you closing this? (optional)</DialogTitle>
              <DialogDescription>
                A tap of feedback helps us improve the network. Skip anytime.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {CLOSURE_REASONS.map((r) => {
                const on = code === r.code;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setCode(on ? null : r.code)}
                    className={
                      "rounded-full border px-3.5 py-1.5 text-[13px] " +
                      (on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-surface text-foreground hover:bg-secondary")
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            {code === "other" && (
              <Textarea
                rows={2}
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
                className="rounded-xl bg-surface"
                placeholder="Tell us briefly (optional)"
              />
            )}
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setStep("ask")} disabled={busy}>Back</Button>
              <Button onClick={submitNo} disabled={busy}>
                {busy ? "Saving…" : "Close intent"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
