import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";
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
  const isCreator = creatorId === meId;

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

  // The "candidate" is always the non-creator party -- the one whose
  // participation is actually being tracked. Creators don't join their own
  // intents; only the other person's status matters here.
  const partner = isCreator ? otherId : creatorId;
  const myRow = data?.parts.find((p) => p.user_id === meId);
  const partnerRow = data?.parts.find((p) => p.user_id === partner);
  const joinMode = (data?.intent?.join_mode ?? "mutual_confirm") as JoinMode;

  const candidate = isCreator ? partnerRow : myRow;
  const candidateUserId = isCreator ? partner : meId;
  const status = candidate?.state ?? "interested";

  // Only the participant can request/join. Only the creator can approve.
  const requested = status === "joining";
  const joined = status === "confirmed";

  const request = useMutation({
    mutationFn: async () => {
      const state: ParticipationState = joinMode === "open_join" ? "confirmed" : "joining";
      const { error } = await supabase.from("intent_participants").upsert({
        intent_id: intentId, user_id: candidateUserId,
        state,
        confirm_initiated_by: meId,
        confirm_initiated_at: new Date().toISOString(),
        ...(state === "confirmed" ? { joined_at: new Date().toISOString() } : {}),
      }, { onConflict: "intent_id,user_id" });
      if (error) throw error;
      return state === "confirmed" ? ("joined" as const) : ("requested" as const);
    },
    onSuccess: (kind) => {
      toast.success(kind === "joined" ? "You're in!" : "Request sent");
      qc.invalidateQueries({ queryKey: ["intent-participation-card", intentId, meId, otherId] });
      qc.invalidateQueries({ queryKey: ["intent", intentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("intent_participants").update({
        state: "confirmed" as ParticipationState,
        joined_at: new Date().toISOString(),
      }).eq("intent_id", intentId).eq("user_id", candidateUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request approved");
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
      toast.success(isCreator ? "Declined" : "Request withdrawn");
      qc.invalidateQueries({ queryKey: ["intent-participation-card", intentId, meId, otherId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data?.intent) return null;

  return (
    <div className="border-b border-border bg-secondary/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-muted-foreground">{data.intent.title}</p>
          <p className="flex items-center gap-1.5 text-[13px] font-medium">
            {joined ? (
              <><CheckCircle2 className="size-3.5 text-emerald-600" /> Joined</>
            ) : requested ? (
              isCreator ? (
                <><Hourglass className="size-3.5 text-amber-600" /> Wants to join</>
              ) : (
                <><Hourglass className="size-3.5 text-amber-600" /> Request sent — awaiting approval</>
              )
            ) : isCreator ? (
              "No request yet"
            ) : (
              "Not joined yet"
            )}
          </p>
        </div>
        {!joined && (
          <div className="flex gap-2">
            {isCreator && requested && (
              <>
                <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => decline.mutate()} disabled={decline.isPending}>
                  Decline
                </Button>
                <Button size="sm" className="h-8 rounded-full" onClick={() => approve.mutate()} disabled={approve.isPending}>
                  Approve request
                </Button>
              </>
            )}
            {!isCreator && !requested && (
              <Button size="sm" className="h-8 rounded-full" onClick={() => request.mutate()} disabled={request.isPending}>
                {joinMode === "open_join" ? "Join now" : "Request to join"}
              </Button>
            )}
            {!isCreator && requested && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full" onClick={() => decline.mutate()} disabled={decline.isPending}>
                <XCircle className="size-3.5" /> Withdraw request
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
