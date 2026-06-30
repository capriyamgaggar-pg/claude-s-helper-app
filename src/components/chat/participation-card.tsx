import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { JoinMode, ParticipationState } from "@/lib/participation";

interface Props {
  intentId: string;
  meId: string;
  otherId: string;
  creatorId: string;
}

interface PartRow {
  user_id: string;
  state: ParticipationState;
  confirm_initiated_by: string | null;
}

export function ParticipationCard({ intentId, meId, otherId, creatorId }: Props) {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["intent-participation-card", intentId, meId, otherId],
    queryFn: async () => {
      const { data: intent } = await supabase.from("intents")
        .select("id, title, join_mode, people_needed")
        .eq("id", intentId).single();
      const ids = Array.from(new Set([meId, otherId, creatorId]));
      const { data: parts } = await supabase.from("intent_participants")
        .select("user_id, state, confirm_initiated_by")
        .eq("intent_id", intentId)
        .in("user_id", ids);
      return { intent, parts: (parts ?? []) as PartRow[] };
    },
  });

  const partner = creatorId === meId ? otherId : creatorId;
  const myRow = data?.parts.find((p) => p.user_id === meId);
  const partnerRow = data?.parts.find((p) => p.user_id === partner);
  const joinMode = (data?.intent?.join_mode ?? "mutual_confirm") as JoinMode;

  const candidate = creatorId === meId ? partnerRow : myRow;
  const candidateUserId = creatorId === meId ? partner : meId;

  const proposeOrAccept = useMutation({
    mutationFn: async () => {
      const current = candidate?.state;
      if (joinMode === "open_join") {
        const { error } = await supabase.from("intent_participants").upsert({
          intent_id: intentId, user_id: candidateUserId,
          state: "confirmed" as ParticipationState,
          joined_at: new Date().toISOString(),
        }, { onConflict: "intent_id,user_id" });
        if (error) throw error;
        return "joined" as const;
      }
      if (!current || current === "interested" || current === "left" || current === "declined") {
        const { error } = await supabase.from("intent_participants").upsert({
          intent_id: intentId, user_id: candidateUserId,
          state: "joining" as ParticipationState,
          confirm_initiated_by: meId,
          confirm_initiated_at: new Date().toISOString(),
        }, { onConflict: "intent_id,user_id" });
        if (error) throw error;
        return "proposed" as const;
      }
      if (current === "joining" && candidate?.confirm_initiated_by !== meId) {
        const { error } = await supabase.from("intent_participants").update({
          state: "confirmed" as ParticipationState,
          joined_at: new Date().toISOString(),
        }).eq("intent_id", intentId).eq("user_id", candidateUserId);
        if (error) throw error;
        return "joined" as const;
      }
      return "noop" as const;
    },
    onSuccess: (kind) => {
      if (kind === "joined") toast.success("Participation confirmed");
      else if (kind === "proposed") toast.success("Confirmation proposed");
      qc.invalidateQueries({ queryKey: ["intent-participation-card", intentId, meId, otherId] });
      qc.invalidateQueries({ queryKey: ["intent", intentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decline = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("intent_participants").update({
        state: "interested" as ParticipationState,
        confirm_initiated_by: null,
        confirm_initiated_at: null,
      }).eq("intent_id", intentId).eq("user_id", candidateUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Declined");
      qc.invalidateQueries({ queryKey: ["intent-participation-card", intentId, meId, otherId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data?.intent) return null;

  const status = candidate?.state ?? "interested";
  const awaitingMe = status === "joining" && candidate?.confirm_initiated_by !== meId;
  const awaitingOther = status === "joining" && candidate?.confirm_initiated_by === meId;
  const joined = status === "confirmed";

  return (
    <div className="border-b border-border bg-secondary/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-muted-foreground">{data.intent.title}</p>
          <p className="flex items-center gap-1.5 text-[13px] font-medium">
            {joined ? (
              <><CheckCircle2 className="size-3.5 text-emerald-600" /> Joined</>
            ) : awaitingMe ? (
              <><Hourglass className="size-3.5 text-amber-600" /> Confirmation pending — your turn</>
            ) : awaitingOther ? (
              <><Hourglass className="size-3.5 text-amber-600" /> Awaiting confirmation</>
            ) : (
              "Not joined yet"
            )}
          </p>
        </div>
        {!joined && (
          <div className="flex gap-2">
            {awaitingMe ? (
              <>
                <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => decline.mutate()} disabled={decline.isPending}>
                  Decline
                </Button>
                <Button size="sm" className="h-8 rounded-full" onClick={() => proposeOrAccept.mutate()} disabled={proposeOrAccept.isPending}>
                  Accept
                </Button>
              </>
            ) : (
              <Button size="sm" className="h-8 rounded-full" onClick={() => proposeOrAccept.mutate()} disabled={proposeOrAccept.isPending || awaitingOther}>
                {joinMode === "open_join" ? "Join now" : "Confirm Participation"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
