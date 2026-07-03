// Organizer: list of submissions for the registration form.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ensureRegistrationStep, type FormField } from "@/lib/registration-form";

export const Route = createFileRoute("/_authenticated/intents/$intentId/submissions")({
  head: () => ({ meta: [{ title: "Responses — Intent" }] }),
  component: Submissions,
});

interface SubRow {
  id: string;
  participant_id: string;
  status: string;
  form_version: number;
  submitted_at: string | null;
  created_at: string;
  profiles: { id: string; name: string | null; photo_url: string | null } | null;
}
interface AnswerRow { field_id: string; field_key: string | null; value: unknown; file_path: string | null }

function Submissions() {
  const { intentId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [stepId, setStepId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<"pending" | "approved" | "declined">("pending");

  const intentQ = useQuery({
    queryKey: ["intent-owner", intentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select("id, creator_id, title").eq("id", intentId).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (intentQ.data?.creator_id !== user.id) return;
    ensureRegistrationStep(intentId).then(setStepId).catch(console.error);
  }, [intentQ.data, intentId, user.id]);

  const fieldsQ = useQuery({
    enabled: !!stepId,
    queryKey: ["form-fields-all", stepId],
    queryFn: async () => {
      const { data } = await supabase.from("journey_form_fields")
        .select("*").eq("step_id", stepId!).order("sort");
      return (data ?? []) as unknown as FormField[];
    },
  });

  const subsQ = useQuery({
    enabled: !!stepId,
    queryKey: ["submissions", stepId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_form_submissions")
        .select("id, participant_id, status, form_version, submitted_at, created_at, profiles:profiles!journey_form_submissions_participant_id_fkey(id, name, photo_url)")
        .eq("step_id", stepId!)
        .order("created_at", { ascending: false });
      if (error) {
        // Fallback without FK alias (table may not have explicit FK to profiles)
        const r = await supabase.from("journey_form_submissions")
          .select("id, participant_id, status, form_version, submitted_at, created_at")
          .eq("step_id", stepId!).order("created_at", { ascending: false });
        if (r.error) throw r.error;
        const ids = (r.data ?? []).map((s) => s.participant_id);
        const { data: profs } = ids.length
          ? await supabase.from("profiles").select("id, name, photo_url").in("id", ids)
          : { data: [] };
        const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
        return (r.data ?? []).map((s) => ({ ...s, profiles: profMap.get(s.participant_id) ?? null })) as unknown as SubRow[];
      }
      return data as unknown as SubRow[];
    },
  });

  // Everyone who has actually acted on this intent (requested to join,
  // been confirmed, or been declined) -- not just people who submitted the
  // registration form. Accepting/declining someone through chat previously
  // never showed up here at all if they'd never filled the form.
  const applicantsQ = useQuery({
    queryKey: ["intent-applicants", intentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("intent_participants")
        .select("user_id, state, created_at, profiles:profiles!intent_participants_user_id_fkey(id, name, photo_url)")
        .eq("intent_id", intentId)
        .in("state", ["interested", "joining", "confirmed", "declined"])
        .order("created_at", { ascending: false });
      if (error) {
        const r = await supabase.from("intent_participants")
          .select("user_id, state, created_at").eq("intent_id", intentId)
          .in("state", ["interested", "joining", "confirmed", "declined"])
          .order("created_at", { ascending: false });
        if (r.error) throw r.error;
        const ids = (r.data ?? []).map((p) => p.user_id);
        const { data: profs } = ids.length
          ? await supabase.from("profiles").select("id, name, photo_url").in("id", ids)
          : { data: [] };
        const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
        return (r.data ?? []).map((p) => ({ ...p, profiles: profMap.get(p.user_id) ?? null }));
      }
      return data;
    },
  });

  const approve = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase.from("intent_participants").upsert({
        intent_id: intentId, user_id: participantId,
        state: "confirmed", joined_at: new Date().toISOString(),
      }, { onConflict: "intent_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approved");
      applicantsQ.refetch();
      qc.invalidateQueries({ queryKey: ["new-response-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decline = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase.from("intent_participants").update({
        state: "declined",
      }).eq("intent_id", intentId).eq("user_id", participantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Declined");
      applicantsQ.refetch();
      qc.invalidateQueries({ queryKey: ["new-response-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openSubmissionId = (() => {
    const applicant = (applicantsQ.data ?? []).find((p) => p.user_id === openId);
    if (!applicant) return null;
    return (subsQ.data ?? []).find((s) => s.participant_id === applicant.user_id)?.id ?? null;
  })();

  const answersQ = useQuery({
    enabled: !!openSubmissionId,
    queryKey: ["submission-answers", openSubmissionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("journey_form_answers")
        .select("field_id, field_key, value, file_path").eq("submission_id", openSubmissionId!);
      if (error) throw error;
      return (data ?? []) as AnswerRow[];
    },
  });

  if (intentQ.isLoading) return <div className="p-4"><Skeleton className="h-8 w-40" /></div>;
  if (intentQ.data && intentQ.data.creator_id !== user.id) {
    return <div className="p-6 text-sm text-muted-foreground">Only the organizer can view responses.</div>;
  }

  const fieldsById = new Map((fieldsQ.data ?? []).map((f) => [f.id, f]));
  const subs = subsQ.data ?? [];
  const subByParticipant = new Map(subs.map((s) => [s.participant_id, s]));

  type Applicant = {
    key: string;
    participant_id: string;
    profiles: { id: string; name: string | null; photo_url: string | null } | null;
    state: string;
    submission: SubRow | null;
  };
  const applicants: Applicant[] = (applicantsQ.data ?? []).map((p) => ({
    key: p.user_id,
    participant_id: p.user_id,
    profiles: p.profiles ?? null,
    state: p.state,
    submission: subByParticipant.get(p.user_id) ?? null,
  }));

  const pendingSubs = applicants.filter((a) => a.state !== "confirmed" && a.state !== "declined");
  const approvedSubs = applicants.filter((a) => a.state === "confirmed");
  const declinedSubs = applicants.filter((a) => a.state === "declined");
  const visibleSubs = statusTab === "pending" ? pendingSubs : statusTab === "approved" ? approvedSubs : declinedSubs;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/intents/$intentId" params={{ intentId }}
          className="rounded-full p-1.5 hover:bg-muted"><ChevronLeft className="size-5" /></Link>
        <div>
          <p className="text-sm font-semibold">Responses</p>
          <p className="text-xs text-muted-foreground">{applicants.length} total</p>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pt-3">
        {([
          { id: "pending" as const, label: "Pending", count: pendingSubs.length },
          { id: "approved" as const, label: "Approved", count: approvedSubs.length },
          { id: "declined" as const, label: "Declined", count: declinedSubs.length },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setStatusTab(t.id); setOpenId(null); }}
            className={
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors " +
              (statusTab === t.id ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/70")
            }
          >
            {t.label}
            {t.count > 0 && (
              <span className={"rounded-full px-1.5 text-[11px] " + (statusTab === t.id ? "bg-background/20" : "bg-background")}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-2 p-4">
        {applicantsQ.isLoading && <Skeleton className="h-20" />}
        {!applicantsQ.isLoading && visibleSubs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {statusTab === "pending" ? "No pending responses." : statusTab === "approved" ? "Nobody approved yet." : "Nobody declined."}
          </div>
        )}
        {visibleSubs.map((a) => (
          <div key={a.key} className="rounded-lg border border-border bg-card">
            <div role="button" tabIndex={0} className="flex w-full items-center justify-between p-3 text-left cursor-pointer"
              onClick={() => setOpenId(openId === a.key ? null : a.key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenId(openId === a.key ? null : a.key); }}>
              <div className="flex items-center gap-2 min-w-0">
                {a.profiles?.photo_url ? (
                  <img src={a.profiles.photo_url} className="size-8 rounded-full object-cover" alt="" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-xs">
                    {(a.profiles?.name?.[0] ?? "·").toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <Link to="/profile/$userId" params={{ userId: a.participant_id }}
                    className="truncate text-sm font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                    {a.profiles?.name ?? "Anonymous"}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {a.submission
                      ? `${a.submission.status} · v${a.submission.form_version} · ${new Date(a.submission.submitted_at ?? a.submission.created_at).toLocaleString()}`
                      : "Requested via chat — no registration submitted"}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{openId === a.key ? "Hide" : "View"}</span>
            </div>
            {openId === a.key && (
              <div className="space-y-2 border-t border-border p-3">
                {!a.submission && (
                  <p className="text-[13px] text-muted-foreground">No registration form was submitted — this request came through chat.</p>
                )}
                {a.submission && answersQ.isLoading && <Skeleton className="h-16" />}
                {a.submission && (answersQ.data ?? []).map((ans) => {
                  const f = fieldsById.get(ans.field_id);
                  if (!f || f.kind === "section") return null;
                  return (
                    <div key={ans.field_id} className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-muted-foreground">{f.label}</div>
                      <div className="col-span-2 break-words">
                        <AnswerCell value={ans.value} filePath={ans.file_path} kind={f.kind} options={f.validation?.options} />
                      </div>
                    </div>
                  );
                })}
                {a.state === "confirmed" ? (
                  <p className="flex items-center gap-1.5 pt-2 text-[13px] font-medium text-emerald-700">
                    <CheckCircle2 className="size-4" /> Approved
                  </p>
                ) : a.state === "declined" ? (
                  <p className="pt-2 text-[13px] text-muted-foreground">Declined</p>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full"
                      onClick={() => decline.mutate(a.participant_id)} disabled={decline.isPending}>
                      <XCircle className="size-3.5" /> Decline
                    </Button>
                    <Button size="sm" className="h-8 gap-1.5 rounded-full"
                      onClick={() => approve.mutate(a.participant_id)} disabled={approve.isPending}>
                      <CheckCircle2 className="size-3.5" /> Approve
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerCell({ value, filePath, kind, options }: { value: unknown; filePath: string | null; kind?: string; options?: { value: string; label: string }[] }) {
  const [signed, setSigned] = useState<string | null>(null);
  useEffect(() => {
    if (!filePath) return;
    supabase.storage.from("registration-uploads").createSignedUrl(filePath, 600)
      .then(({ data }) => setSigned(data?.signedUrl ?? null));
  }, [filePath]);

  if (filePath) {
    return signed ? <a className="text-primary underline" href={signed} target="_blank" rel="noreferrer">View file</a> : <span className="text-muted-foreground">Loading…</span>;
  }
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;

  const labelFor = (raw: unknown) => options?.find((o) => o.value === raw)?.label ?? String(raw);

  if ((kind === "dropdown" || kind === "radio") && options?.length) {
    return <span>{labelFor(value)}</span>;
  }
  if (kind === "checkbox_multi" && options?.length && Array.isArray(value)) {
    return <span>{value.map((v) => labelFor(v)).join(", ")}</span>;
  }

  if (kind === "location" && typeof value === "object" && value !== null) {
    const loc = value as { label?: string; locality?: string; city?: string; state?: string };
    const text = loc.label || [loc.locality, loc.city, loc.state].filter(Boolean).join(", ");
    return <span>{text || "—"}</span>;
  }
  if (kind === "payment_reference" && typeof value === "object" && value !== null) {
    const ref = (value as { ref?: string }).ref;
    return ref ? <span>{ref}</span> : <span className="text-muted-foreground">Not provided</span>;
  }
  if (kind === "emergency_contact" && typeof value === "object" && value !== null) {
    const c = value as { name?: string; phone?: string };
    const text = [c.name, c.phone].filter(Boolean).join(" — ");
    return <span>{text || "—"}</span>;
  }

  if (Array.isArray(value)) return <span>{value.join(", ")}</span>;
  if (typeof value === "object") return <code className="text-xs">{JSON.stringify(value)}</code>;
  return <span>{String(value)}</span>;
}
