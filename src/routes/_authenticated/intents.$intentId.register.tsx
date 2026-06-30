// Participant Runner — fill out the registration form for an intent.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldRuntime } from "@/components/registration/field-runtime";
import {
  ensureRegistrationStep, validateValue, gridColsForWidth, valueFromProfile,
  type FormField, type ProfileSourceKey,
} from "@/lib/registration-form";

export const Route = createFileRoute("/_authenticated/intents/$intentId/register")({
  head: () => ({ meta: [{ title: "Register — Intent" }] }),
  component: Runner,
});

function Runner() {
  const { intentId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [stepId, setStepId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const intentQ = useQuery({
    queryKey: ["intent-public", intentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select("id, title, creator_id").eq("id", intentId).single();
      if (error) throw error;
      return data;
    },
  });

  const profileQ = useQuery({
    queryKey: ["my-profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data as Record<string, unknown> | null;
    },
  });

  useEffect(() => {
    ensureRegistrationStep(intentId).then(setStepId).catch(() => toast.error("Could not load form."));
  }, [intentId]);

  const fieldsQ = useQuery({
    enabled: !!stepId,
    queryKey: ["form-fields-active", stepId],
    queryFn: async () => {
      const { data, error } = await supabase.from("journey_form_fields")
        .select("*").eq("step_id", stepId!).is("archived_at", null)
        .order("sort", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FormField[];
    },
  });

  const fields = fieldsQ.data ?? [];

  // Load existing draft / submitted answers
  const subQ = useQuery({
    enabled: !!stepId,
    queryKey: ["my-submission", stepId, user.id],
    queryFn: async () => {
      const { data: sub } = await supabase.from("journey_form_submissions")
        .select("id, status, form_version")
        .eq("step_id", stepId!).eq("participant_id", user.id).maybeSingle();
      if (!sub) return { sub: null, answers: [] as { field_id: string; value: unknown }[] };
      const { data: ans } = await supabase.from("journey_form_answers")
        .select("field_id, value").eq("submission_id", sub.id);
      return { sub, answers: (ans ?? []) as { field_id: string; value: unknown }[] };
    },
  });

  // Initialize values from autofill + existing answers
  useEffect(() => {
    if (!fieldsQ.data || !profileQ.data || !subQ.data) return;
    const next: Record<string, unknown> = {};
    const existing = new Map(subQ.data.answers.map((a) => [a.field_id, a.value]));
    for (const f of fieldsQ.data) {
      if (f.kind === "section") continue;
      if (existing.has(f.id)) { next[f.id] = existing.get(f.id); continue; }
      if (f.auto_fill?.scope === "profile" && f.auto_fill.source_key) {
        next[f.id] = valueFromProfile(profileQ.data, f.auto_fill.source_key as ProfileSourceKey);
      } else if (f.default_value !== null && f.default_value !== undefined) {
        next[f.id] = f.default_value;
      }
    }
    setValues((prev) => ({ ...next, ...prev }));
    if (subQ.data.sub?.status === "submitted") setDone(true);
  }, [fieldsQ.data, profileQ.data, subQ.data]);

  const isReadOnly = useMemo(() => done, [done]);

  async function submitForm() {
    if (!stepId || !intentQ.data) return;
    // validate
    const errs: Record<string, string | null> = {};
    let anyErr = false;
    for (const f of fields) {
      const e = validateValue(f, values[f.id]);
      if (e) { anyErr = true; errs[f.id] = e; } else errs[f.id] = null;
    }
    setErrors(errs);
    if (anyErr) { toast.error("Please fix the highlighted fields."); return; }

    setSubmitting(true);
    try {
      // Fetch current form_version
      const { data: cfg } = await supabase.from("journey_step_config")
        .select("config").eq("step_id", stepId).maybeSingle();
      const version = ((cfg?.config as { form_version?: number } | null)?.form_version) ?? 1;

      // upsert submission
      const { data: sub, error: subErr } = await supabase
        .from("journey_form_submissions")
        .upsert({
          step_id: stepId,
          intent_id: intentId,
          participant_id: user.id,
          status: "submitted",
          form_version: version,
          submitted_at: new Date().toISOString(),
        }, { onConflict: "step_id,participant_id" })
        .select("id").single();
      if (subErr) throw subErr;

      // Upload file values first
      const answerRows: { submission_id: string; field_id: string; field_key: string | null; value: unknown; file_path: string | null }[] = [];
      for (const f of fields) {
        if (f.kind === "section") continue;
        const v = values[f.id];
        let filePath: string | null = null;
        let storedValue: unknown = v;

        if (v instanceof File && (f.kind === "file_upload" || f.kind === "image_upload")) {
          const path = `${intentId}/${user.id}/${f.id}/${Date.now()}_${v.name}`;
          const { error: upErr } = await supabase.storage.from("registration-uploads").upload(path, v, { upsert: true });
          if (upErr) throw upErr;
          filePath = path;
          storedValue = { name: v.name, size: v.size, type: v.type };
        }
        if (f.kind === "payment_reference") {
          const obj = (v as { ref?: string; proof?: File | null } | null) ?? {};
          if (obj.proof instanceof File) {
            const path = `${intentId}/${user.id}/${f.id}/${Date.now()}_${obj.proof.name}`;
            const { error: upErr } = await supabase.storage.from("registration-uploads").upload(path, obj.proof, { upsert: true });
            if (upErr) throw upErr;
            filePath = path;
            storedValue = { ref: obj.ref ?? "", proof: { name: obj.proof.name } };
          } else {
            storedValue = { ref: obj.ref ?? "" };
          }
        }
        answerRows.push({
          submission_id: sub.id,
          field_id: f.id,
          field_key: f.field_key,
          value: storedValue === undefined ? null : (storedValue as unknown),
          file_path: filePath,
        });
      }

      // Delete prior + insert (simplest)
      await supabase.from("journey_form_answers").delete().eq("submission_id", sub.id);
      if (answerRows.length) {
        const { error: ansErr } = await supabase.from("journey_form_answers").insert(answerRows as never);
        if (ansErr) throw ansErr;
      }

      toast.success("Submitted.");
      setDone(true);
    } catch (e) {
      console.error(e);
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (fieldsQ.isLoading || intentQ.isLoading) {
    return <div className="p-4 space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-32" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/intents/$intentId" params={{ intentId }}
          className="rounded-full p-1.5 hover:bg-muted"><ChevronLeft className="size-5" /></Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Register</p>
          <p className="truncate text-xs text-muted-foreground">{intentQ.data?.title}</p>
        </div>
      </div>

      {done && (
        <div className="m-4 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>Your registration was submitted. The organizer will review it.</div>
        </div>
      )}

      {fields.length === 0 && (
        <div className="m-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          The organizer hasn't added any fields yet.
        </div>
      )}

      <form className="grid grid-cols-1 gap-4 p-4 md:grid-cols-12"
        onSubmit={(e) => { e.preventDefault(); if (!isReadOnly) submitForm(); }}>
        {fields.map((f) => (
          <div key={f.id} className={`col-span-1 ${gridColsForWidth(f.display_width)}`}>
            <FieldRuntime
              field={f}
              value={values[f.id]}
              onChange={(v) => setValues((s) => ({ ...s, [f.id]: v }))}
              disabled={isReadOnly}
              error={errors[f.id]}
            />
          </div>
        ))}

        {!isReadOnly && fields.length > 0 && (
          <div className="md:col-span-12">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
