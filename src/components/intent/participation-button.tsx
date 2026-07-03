import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { randomPick, CONNECTION_SENT_MESSAGES } from "@/lib/personality";
import { PendingDots } from "@/components/ui/pending-dots";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  computeStage, ctaForStage, pairKey,
  type ParticipationState, type ConnectionState, type JoinMode,
} from "@/lib/participation";

interface Props {
  intentId: string;
  creatorId: string;
  meId: string;
  joinMode: JoinMode;
  categorySlug: string;
  city: string | null;
  myParticipation: { state: ParticipationState; confirm_initiated_by: string | null } | null;
  connection: { id: string; state: ConnectionState; requested_by: string } | null;
  threadId: string | null;
}

export function ParticipationButton({
  intentId, creatorId, meId, joinMode, categorySlug, city,
  myParticipation, connection, threadId,
}: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [interestOpen, setInterestOpen] = useState(false);
  const [message, setMessage] = useState("");

  const stage = computeStage({ myParticipation, connection, meId, isCreator: creatorId === meId });
  const cta = ctaForStage(stage);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["intent", intentId] });
  }

  const submitInterest = useMutation({
    mutationFn: async (msg: string) => {
      const trimmed = msg.trim().slice(0, 250);
      const { error } = await supabase.from("intent_participants").upsert({
        intent_id: intentId,
        user_id: meId,
        state: "interested",
        interest_message: trimmed || null,
      }, { onConflict: "intent_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Interest shared with the creator");
      setInterestOpen(false);
      setMessage("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestConnect = useMutation({
    mutationFn: async () => {
      const [a, b] = pairKey(meId, creatorId);
      const { error } = await supabase.from("connections").upsert({
        user_a: a, user_b: b,
        requested_by: meId,
        state: "requested",
        intent_id: intentId,
        origin_category: categorySlug,
        origin_city: city,
      }, { onConflict: "user_a,user_b" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(randomPick(CONNECTION_SENT_MESSAGES)); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptConnect = useMutation({
    mutationFn: async () => {
      if (!connection) throw new Error("No connection found");
      const { error } = await supabase.from("connections")
        .update({ state: "accepted" }).eq("id", connection.id);
      if (error) throw error;
      const { data: tExisting } = await supabase.from("threads")
        .select("id").eq("intent_id", intentId).maybeSingle();
      let tid = tExisting?.id as string | undefined;
      if (!tid) {
        const { data: t, error: et } = await supabase.from("threads")
          .insert({ kind: "intent", intent_id: intentId }).select("id").single();
        if (et) throw et;
        tid = t.id;
      }
      const { error: em } = await supabase.from("thread_members").upsert([
        { thread_id: tid, user_id: meId },
        { thread_id: tid, user_id: creatorId },
      ], { onConflict: "thread_id,user_id" });
      if (em) throw em;
      return tid;
    },
    onSuccess: (tid) => {
      toast.success("Connected");
      invalidate();
      if (tid) navigate({ to: "/inbox/$threadId", params: { threadId: tid } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proposeConfirm = useMutation({
    mutationFn: async () => {
      const newState: ParticipationState = joinMode === "open_join" ? "confirmed" : "joining";
      const patch: {
        state: ParticipationState;
        confirm_initiated_by: string | null;
        confirm_initiated_at: string | null;
        joined_at?: string;
      } = {
        state: newState,
        confirm_initiated_by: joinMode === "open_join" ? null : meId,
        confirm_initiated_at: joinMode === "open_join" ? null : new Date().toISOString(),
      };
      if (newState === "confirmed") patch.joined_at = new Date().toISOString();
      const { error } = await supabase.from("intent_participants")
        .update(patch).eq("intent_id", intentId).eq("user_id", meId);
      if (error) throw error;
      return newState;
    },
    onSuccess: (newState) => {
      toast.success(newState === "confirmed" ? "You're in" : "Confirmation proposed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleClick() {
    switch (stage) {
      case "show_interest":
      case "left":
        setInterestOpen(true); break;
      case "request_connect":
      case "interest_saved":
        requestConnect.mutate(); break;
      case "connect_incoming":
        acceptConnect.mutate(); break;
      case "open_chat":
        if (threadId) navigate({ to: "/inbox/$threadId", params: { threadId } });
        else navigate({ to: "/inbox" });
        break;
      case "confirm_incoming":
        proposeConfirm.mutate(); break;
      default: break;
    }
  }

  const busy = submitInterest.isPending || requestConnect.isPending || acceptConnect.isPending || proposeConfirm.isPending;

  return (
    <div className="space-y-2">
      <Button
        className="h-12 w-full rounded-xl gap-1.5"
        variant={cta.variant}
        disabled={cta.disabled || busy}
        onClick={handleClick}
      >
        {cta.label}
        {(stage === "connect_outgoing" || stage === "confirm_outgoing") && <PendingDots />}
      </Button>
      {(cta.hint || stage === "open_chat") && (
        <div className="flex items-center justify-between gap-2">
          {cta.hint && <p className="text-[11px] text-muted-foreground">{cta.hint}</p>}
          {stage === "open_chat" && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2 text-[12px]"
              disabled={busy}
              onClick={() => proposeConfirm.mutate()}
            >
              {joinMode === "open_join" ? "Join now" : "Confirm Participation"}
            </Button>
          )}
        </div>
      )}

      <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Show interest</DialogTitle>
            <DialogDescription>
              Add a short note for the creator (optional). They'll see this in their Interested list.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={message}
            maxLength={250}
            onChange={(e) => setMessage(e.target.value.slice(0, 250))}
            placeholder="A line or two about why this fits you…"
            className="rounded-xl"
          />
          <p className="text-right text-[11px] text-muted-foreground">{message.length}/250</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setInterestOpen(false)}>Cancel</Button>
            <Button onClick={() => submitInterest.mutate(message)} disabled={submitInterest.isPending}>
              {submitInterest.isPending ? "Sharing…" : "Share interest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
