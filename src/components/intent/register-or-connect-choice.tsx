import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { pairKey } from "@/lib/participation";
import { getRegistrationStatus } from "@/lib/registration-form";
import { randomPick, CONNECTION_SENT_MESSAGES } from "@/lib/personality";
import { toast } from "sonner";

interface Props {
  intentId: string;
  creatorId: string;
  meId: string;
  categorySlug: string;
  city: string | null;
}

// Shown the moment interest exists (via "Show Interest" or by registering
// directly) but before a connection has been requested. Presents both
// available next steps as one clear, equal-weight choice, rather than as
// two separately-behaving blocks on the page. Registering does not replace
// connecting -- both stay available.
export function RegisterOrConnectChoice({ intentId, creatorId, meId, categorySlug, city }: Props) {
  const qc = useQueryClient();

  const regStatus = useQuery({
    queryKey: ["registration-status", intentId],
    queryFn: () => getRegistrationStatus(intentId),
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
    onSuccess: () => {
      toast.success(randomPick(CONNECTION_SENT_MESSAGES));
      qc.invalidateQueries({ queryKey: ["intent", intentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasForm = !!regStatus.data?.ready;

  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
      <p className="text-[13px] font-medium text-foreground">You're interested — what next?</p>
      <div className={"mt-3 grid gap-2 " + (hasForm ? "grid-cols-2" : "grid-cols-1")}>
        {hasForm && (
          <Link
            to="/intents/$intentId/register"
            params={{ intentId }}
            className="flex items-center justify-center rounded-xl border border-border bg-background px-3 py-3 text-center text-[13px] font-medium hover:bg-secondary"
          >
            Fill registration
          </Link>
        )}
        <Button
          className="h-auto rounded-xl px-3 py-3 text-[13px]"
          onClick={() => requestConnect.mutate()}
          disabled={requestConnect.isPending}
        >
          Connect & chat
        </Button>
      </div>
    </div>
  );
}
