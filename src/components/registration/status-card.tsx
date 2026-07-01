import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getRegistrationStatus, getSubmissionCount } from "@/lib/registration-form";

export function RegistrationStatusCard({ intentId }: { intentId: string }) {
  const status = useQuery({
    queryKey: ["registration-status", intentId],
    queryFn: () => getRegistrationStatus(intentId),
  });

  const submissions = useQuery({
    enabled: !!status.data?.stepId,
    queryKey: ["registration-submission-count", status.data?.stepId],
    queryFn: () => getSubmissionCount(status.data!.stepId!),
  });

  if (!status.data) {
    return <div className="mt-5 h-32 animate-pulse rounded-2xl border border-border bg-surface" />;
  }

  const ready = status.data.ready;
  const questionCount = status.data.activeFieldCount;
  const registrationCount = submissions.data ?? 0;

  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Registration Setup
        </p>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
            (ready ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")
          }
        >
          <span className={"size-1.5 rounded-full " + (ready ? "bg-emerald-600" : "bg-amber-500")} />
          {ready ? "Registration Ready" : "Registration not ready"}
        </span>
      </div>

      {!ready && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Participants can discover your intent, but they can't register yet.
        </p>
      )}

      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <p className="text-2xl font-semibold leading-none">{questionCount}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {questionCount === 1 ? "Question" : "Questions"}
          </p>
        </div>
        {ready && (
          <div>
            <p className="text-2xl font-semibold leading-none">{registrationCount}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {registrationCount === 1 ? "Registration" : "Registrations"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {ready ? (
          <>
            <Link
              to="/intents/$intentId/form"
              params={{ intentId }}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[13px] font-medium hover:bg-secondary/60"
            >
              Edit Form
            </Link>
            <Link
              to="/intents/$intentId/submissions"
              params={{ intentId }}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[13px] font-medium hover:bg-secondary/60"
            >
              View Responses
            </Link>
          </>
        ) : (
          <Link
            to="/intents/$intentId/form"
            params={{ intentId }}
            className="col-span-2 rounded-xl bg-foreground px-3 py-2.5 text-center text-[13px] font-medium text-background hover:opacity-90"
          >
            Build Registration Form
          </Link>
        )}
      </div>
    </div>
  );
}
