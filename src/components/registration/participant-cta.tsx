import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRegistrationStatus, getRegistrationCTA } from "@/lib/registration-form";

interface Props {
  intentId: string;
  userId: string;
  myParticipationStatus: "none" | "requested" | "approved" | "rejected";
}

export function ParticipantRegistrationCTA({ intentId, userId, myParticipationStatus }: Props) {
  const status = useQuery({
    queryKey: ["registration-status", intentId],
    queryFn: () => getRegistrationStatus(intentId),
  });

  const mySubmission = useQuery({
    enabled: !!status.data?.stepId,
    queryKey: ["my-submission", status.data?.stepId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("journey_form_submissions")
        .select("status")
        .eq("step_id", status.data!.stepId!)
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  if (!status.data) return null;

  const cta = getRegistrationCTA(
    status.data,
    mySubmission.data?.status === "submitted" ? "submitted" : "none",
    myParticipationStatus,
    intentId,
  );

  if (cta.variant === "muted") {
    return (
      <p className="mt-5 rounded-xl border border-dashed border-border bg-surface px-3 py-3 text-center text-[13px] text-muted-foreground">
        {cta.label}
      </p>
    );
  }

  const cls =
    "mt-5 block rounded-xl px-3 py-2.5 text-center text-[14px] font-medium " +
    (cta.variant === "success"
      ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
      : "bg-foreground text-background hover:opacity-90") +
    (cta.disabled ? " pointer-events-none opacity-70" : "");

  if (cta.disabled || !cta.href) {
    return <div className={cls}>{cta.label}</div>;
  }

  return (
    <Link to="/intents/$intentId/register" params={{ intentId }} className={cls}>
      {cta.label}
    </Link>
  );
}
