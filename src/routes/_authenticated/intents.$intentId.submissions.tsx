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

  const partsQ = useQuery({
    enabled: !!subsQ.data,
    queryKey: ["submission-participation-states", intentId, (subsQ.data ?? []).map((s) => s.participant_id).join(",")],
    queryFn: async () => {
      const ids = (subsQ.data ?? []).map((s) => s.participant_id);
      if (ids.length === 0) return new Map<string, string>();
      const { data } = await supabase.from("intent_participants")
        .select("user_id, state").eq("intent_id", intentId).in("user_id", ids);
      return new Map((data ?? []).map((r) => [r.user_id, r.state]));
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
      qc.invalidateQueries({ queryKey: ["submission-participation-states"] });
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
      qc.invalidateQueries({ queryKey: ["submission-participation-states"] });
      qc.invalidateQueries({ queryKey: ["new-response-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const answersQ = useQuery({
    enabled: !!openId,
    queryKey: ["submission-answers", openId],
    queryFn: async () => {
      const { data, error } = await supabase.from("journey_form_answers")
        .select("field_id, field_key, value, file_path").eq("submission_id", openId!);
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

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/intents/$intentId" params={{ intentId }}
          className="rounded-full p-1.5 hover:bg-muted"><ChevronLeft className="size-5" /></Link>
        <div>
          <p className="text-sm font-semibold">Responses</p>
          <p className="text-xs text-muted-foreground">{subs.length} total</p>
        </div>
      </div>

      <div className="space-y-2 p-4">
        {subsQ.isLoading && <Skeleton className="h-20" />}
        {!subsQ.isLoading && subs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No submissions yet.
          </div>
        )}
        {subs.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card">
            <div role="button" tabIndex={0} className="flex w-full items-center justify-between p-3 text-left cursor-pointer"
              onClick={() => setOpenId(openId === s.id ? null : s.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenId(openId === s.id ? null : s.id); }}>
              <div className="flex items-center gap-2 min-w-0">
                {s.profiles?.photo_url ? (
                  <img src={s.profiles.photo_url} className="size-8 rounded-full object-cover" alt="" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-xs">
                    {(s.profiles?.name?.[0] ?? "·").toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <Link to="/profile/$userId" params={{ userId: s.participant_id }}
                    className="truncate text-sm font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                    {s.profiles?.name ?? "Anonymous"}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {s.status} · v{s.form_version} · {new Date(s.submitted_at ?? s.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{openId === s.id ? "Hide" : "View"}</span>
            </div>
            {openId === s.id && (
              <div className="space-y-2 border-t border-border p-3">
                {answersQ.isLoading && <Skeleton className="h-16" />}
                {(answersQ.data ?? []).map((a) => {
                  const f = fieldsById.get(a.field_id);
                  if (!f || f.kind === "section") return null;
                  return (
                    <div key={a.field_id} className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-muted-foreground">{f.label}</div>
                      <div className="col-span-2 break-words">
                        <AnswerCell value={a.value} filePath={a.file_path} kind={f.kind} />
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const pState = partsQ.data?.get(s.participant_id);
                  if (pState === "confirmed") {
                    return (
                      <p className="flex items-center gap-1.5 pt-2 text-[13px] font-medium text-emerald-700">
                        <CheckCircle2 className="size-4" /> Approved
                      </p>
                    );
                  }
                  if (pState === "declined") {
                    return <p className="pt-2 text-[13px] text-muted-foreground">Declined</p>;
                  }
                  return (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full"
                        onClick={() => decline.mutate(s.participant_id)} disabled={decline.isPending}>
                        <XCircle className="size-3.5" /> Decline
                      </Button>
                      <Button size="sm" className="h-8 gap-1.5 rounded-full"
                        onClick={() => approve.mutate(s.participant_id)} disabled={approve.isPending}>
                        <CheckCircle2 className="size-3.5" /> Approve
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerCell({ value, filePath, kind }: { value: unknown; filePath: string | null; kind?: string }) {
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
