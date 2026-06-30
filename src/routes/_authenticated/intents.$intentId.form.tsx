// Organizer Form Builder for an intent's Registration step.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, GripVertical, Copy, Trash2, RotateCcw,
  Pencil, Cloud, Loader2, AlertCircle, Eye, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FIELD_KINDS, kindMeta, slugifyKey, uniqueKey, ensureRegistrationStep,
  type FieldKind, type FormField, gridColsForWidth,
} from "@/lib/registration-form";
import { FieldRuntime } from "@/components/registration/field-runtime";
import { FieldEditorDialog } from "@/components/registration/field-editor-dialog";

export const Route = createFileRoute("/_authenticated/intents/$intentId/form")({
  head: () => ({ meta: [{ title: "Registration form — Intent" }] }),
  component: FormBuilder,
});

type SaveStatus = "idle" | "saving" | "saved" | "error";

function FormBuilder() {
  const { intentId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [stepId, setStepId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FormField | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Verify intent ownership
  const intentQ = useQuery({
    queryKey: ["intent-owner", intentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intents").select("id, creator_id, title").eq("id", intentId).single();
      if (error) throw error;
      return data;
    },
  });

  // Ensure step exists
  useEffect(() => {
    if (!intentQ.data || intentQ.data.creator_id !== user.id) return;
    ensureRegistrationStep(intentId).then(setStepId).catch((e) => {
      console.error(e); toast.error("Could not load the form.");
    });
  }, [intentQ.data, intentId, user.id]);

  const fieldsQ = useQuery({
    enabled: !!stepId,
    queryKey: ["form-fields", stepId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_form_fields")
        .select("*")
        .eq("step_id", stepId!)
        .order("sort", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FormField[];
    },
  });

  const allFields = fieldsQ.data ?? [];
  const fields = allFields.filter((f) => !f.archived_at);
  const archived = allFields.filter((f) => f.archived_at);
  const existingKeySet = useMemo(
    () => new Set(fields.filter((f) => f.field_key).map((f) => f.field_key!)),
    [fields],
  );

  async function withStatus<T>(p: Promise<T>): Promise<T | null> {
    setStatus("saving");
    try { const r = await p; setStatus("saved"); return r; }
    catch (e) { console.error(e); setStatus("error"); toast.error("Save failed."); return null; }
  }

  // ---- add ---------------------------------------------------------------
  async function addField(kind: FieldKind) {
    if (!stepId) return;
    const meta = kindMeta(kind);
    const nextSort = (fields[fields.length - 1]?.sort ?? -1) + 1;
    const base = slugifyKey(meta.defaultLabel);
    const key = meta.isLayout ? null : uniqueKey(base, existingKeySet);
    await withStatus(supabase.from("journey_form_fields").insert({
      step_id: stepId,
      kind,
      label: meta.defaultLabel,
      field_key: key,
      sort: nextSort,
      required: false,
      display_width: "full",
      validation: meta.defaultValidation ?? {},
      auto_fill: { scope: null, source_key: null, editable_after_fill: true },
      created_by: user.id,
    }));
    await qc.invalidateQueries({ queryKey: ["form-fields", stepId] });
  }

  async function updateField(id: string, patch: Partial<FormField>) {
    await withStatus(
      supabase.from("journey_form_fields").update(patch as Record<string, unknown>).eq("id", id)
    );
    await qc.invalidateQueries({ queryKey: ["form-fields", stepId] });
  }

  async function duplicateField(f: FormField) {
    if (!stepId) return;
    const nextSort = f.sort + 1;
    // Push siblings down
    const after = fields.filter((x) => x.sort > f.sort);
    for (const s of after) {
      await supabase.from("journey_form_fields").update({ sort: s.sort + 1 }).eq("id", s.id);
    }
    const base = slugifyKey((f.label || "field") + " copy");
    const key = f.kind === "section" ? null : uniqueKey(base, existingKeySet);
    await withStatus(supabase.from("journey_form_fields").insert({
      step_id: stepId,
      kind: f.kind,
      label: f.label + " (copy)",
      description: f.description,
      field_key: key,
      required: f.required,
      placeholder: f.placeholder,
      help_text: f.help_text,
      default_value: f.default_value,
      validation: f.validation,
      auto_fill: f.auto_fill,
      display_width: f.display_width,
      visible_if: f.visible_if,
      organizer_only: f.organizer_only,
      sort: nextSort,
      created_by: user.id,
    }));
    await qc.invalidateQueries({ queryKey: ["form-fields", stepId] });
  }

  async function archiveField(id: string) {
    await withStatus(
      supabase.from("journey_form_fields")
        .update({ archived_at: new Date().toISOString(), archived_by: user.id })
        .eq("id", id)
    );
    await qc.invalidateQueries({ queryKey: ["form-fields", stepId] });
  }

  async function restoreField(id: string) {
    await withStatus(
      supabase.from("journey_form_fields")
        .update({ archived_at: null, archived_by: null }).eq("id", id)
    );
    await qc.invalidateQueries({ queryKey: ["form-fields", stepId] });
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = fields.findIndex((f) => f.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= fields.length) return;
    const a = fields[idx], b = fields[j];
    await withStatus(Promise.all([
      supabase.from("journey_form_fields").update({ sort: b.sort }).eq("id", a.id),
      supabase.from("journey_form_fields").update({ sort: a.sort }).eq("id", b.id),
    ]));
    await qc.invalidateQueries({ queryKey: ["form-fields", stepId] });
  }

  // ---- guards ------------------------------------------------------------
  if (intentQ.isLoading) {
    return <div className="p-4"><Skeleton className="h-8 w-40" /></div>;
  }
  if (intentQ.data && intentQ.data.creator_id !== user.id) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Only the organizer can edit this form.</p>
        <Link to="/intents/$intentId" params={{ intentId }} className="mt-2 inline-block text-sm underline">
          ← Back to intent
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/intents/$intentId" params={{ intentId }}
            className="rounded-full p-1.5 hover:bg-muted"><ChevronLeft className="size-5" /></Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Registration form</p>
            <p className="truncate text-xs text-muted-foreground">{intentQ.data?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SaveBadge status={status} />
          <Link to="/intents/$intentId/submissions" params={{ intentId }}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <ClipboardList className="size-4" /> Responses
            </Button>
          </Link>
        </div>
      </div>

      {/* Palette */}
      <div className="border-b border-border p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add a field</p>
        {(["layout", "core", "organizer"] as const).map((g) => (
          <div key={g} className="mb-2">
            <p className="mb-1 text-xs capitalize text-muted-foreground">{g}</p>
            <div className="flex flex-wrap gap-1.5">
              {FIELD_KINDS.filter((k) => k.group === g).map((k) => (
                <Button key={k.kind} size="sm" variant="outline" className="gap-1"
                  onClick={() => addField(k.kind)} disabled={!stepId}>
                  <Plus className="size-3.5" /> {k.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Live list */}
      <div className="space-y-2 p-4">
        {fieldsQ.isLoading && <Skeleton className="h-24 w-full" />}
        {!fieldsQ.isLoading && fields.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No fields yet. Add one above to start.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {fields.map((f, i) => (
            <div key={f.id} className={`rounded-lg border border-border bg-card p-3 ${gridColsForWidth(f.display_width)} col-span-1`}>
              <div className="mb-2 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex flex-col">
                    <button type="button" className="text-muted-foreground hover:text-foreground"
                      disabled={i === 0} onClick={() => move(f.id, -1)} title="Move up">▲</button>
                    <button type="button" className="text-muted-foreground hover:text-foreground"
                      disabled={i === fields.length - 1} onClick={() => move(f.id, 1)} title="Move down">▼</button>
                  </div>
                  <GripVertical className="size-3.5 text-muted-foreground" />
                  <span className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                    {kindMeta(f.kind).label}
                    {f.field_key && ` · ${f.field_key}`}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(f)} title="Edit">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => duplicateField(f)} title="Duplicate">
                    <Copy className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => archiveField(f.id)} title="Archive">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="pointer-events-none opacity-90">
                <FieldRuntime field={f} value={f.default_value ?? null} onChange={() => {}} disabled />
              </div>
            </div>
          ))}
        </div>

        {/* Archived */}
        {archived.length > 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-border">
            <button type="button"
              className="flex w-full items-center justify-between p-3 text-sm"
              onClick={() => setShowArchived((s) => !s)}>
              <span className="font-medium">Archived fields ({archived.length})</span>
              <span className="text-xs text-muted-foreground">{showArchived ? "Hide" : "Show"}</span>
            </button>
            {showArchived && (
              <div className="space-y-1.5 border-t border-border p-3">
                {archived.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded border border-border bg-muted/40 p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{f.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {kindMeta(f.kind).label}{f.field_key && ` · ${f.field_key}`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => restoreField(f.id)}>
                      <RotateCcw className="size-3.5" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview link */}
        {fields.length > 0 && (
          <div className="pt-4">
            <Link to="/intents/$intentId/register" params={{ intentId }}>
              <Button variant="outline" className="w-full gap-1.5"><Eye className="size-4" /> Preview as participant</Button>
            </Link>
          </div>
        )}
      </div>

      <FieldEditorDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        field={editing}
        existingKeys={new Set(
          Array.from(existingKeySet).filter((k) => !editing || editing.field_key !== k)
        )}
        onSave={(patch) => editing && updateField(editing.id, patch)}
      />
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "saving")
    return <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px]"><Loader2 className="size-3 animate-spin" /> Saving…</span>;
  if (status === "saved")
    return <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Cloud className="size-3" /> Saved</span>;
  if (status === "error")
    return <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-[11px] text-destructive"><AlertCircle className="size-3" /> Error</span>;
  return null;
}
