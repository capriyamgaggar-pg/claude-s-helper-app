// Settings dialog for a single field in the builder.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, RotateCw } from "lucide-react";
import type { FormField, DisplayWidth, AutoFillScope } from "@/lib/registration-form";
import { PROFILE_SOURCE_KEYS, slugifyKey } from "@/lib/registration-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FormField | null;
  /** Existing keys on the step (excluding this field) — used to validate the field_key. */
  existingKeys: Set<string>;
  onSave: (patch: Partial<FormField>) => void;
}

export function FieldEditorDialog({ open, onOpenChange, field, existingKeys, onSave }: Props) {
  const [draft, setDraft] = useState<FormField | null>(field);

  useEffect(() => { setDraft(field); }, [field]);

  if (!draft) return null;

  const isSection = draft.kind === "section";
  const hasOptions = ["dropdown", "radio", "checkbox_multi"].includes(draft.kind);
  const isText = ["short_text", "long_text"].includes(draft.kind);
  const isNumber = draft.kind === "number";
  const isFile = ["file_upload", "image_upload"].includes(draft.kind);

  const setField = <K extends keyof FormField>(k: K, v: FormField[K]) =>
    setDraft({ ...draft, [k]: v });

  const setRule = (patch: Partial<FormField["validation"]>) =>
    setDraft({ ...draft, validation: { ...draft.validation, ...patch } });

  const setAutoFill = (patch: Partial<FormField["auto_fill"]>) =>
    setDraft({ ...draft, auto_fill: { ...draft.auto_fill, ...patch } });

  function save() {
    onSave(draft!);
    onOpenChange(false);
  }

  function resetKey() {
    if (!draft) return;
    const base = slugifyKey(draft.label);
    let key = base;
    let i = 2;
    while (existingKeys.has(key)) key = `${base}_${i++}`;
    setField("field_key", key);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isSection ? "Edit section" : "Edit field"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input value={draft.label} onChange={(e) => setField("label", e.target.value)} />
          </div>

          <div>
            <Label>Description {isSection ? "" : "(optional)"}</Label>
            <Textarea value={draft.description ?? ""} rows={2}
              onChange={(e) => setField("description", e.target.value || null)} />
          </div>

          {!isSection && (
            <>
              <div>
                <Label>Help text (short hint shown under input)</Label>
                <Input value={draft.help_text ?? ""}
                  onChange={(e) => setField("help_text", e.target.value || null)} />
              </div>

              <div>
                <Label>Placeholder</Label>
                <Input value={draft.placeholder ?? ""}
                  onChange={(e) => setField("placeholder", e.target.value || null)} />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Required</p>
                  <p className="text-xs text-muted-foreground">Participant must answer.</p>
                </div>
                <Switch checked={draft.required} onCheckedChange={(c) => setField("required", c)} />
              </div>

              <div>
                <Label>Field key</Label>
                <div className="flex gap-2">
                  <Input value={draft.field_key ?? ""}
                    onChange={(e) => setField("field_key", slugifyKey(e.target.value))} />
                  <Button type="button" variant="outline" size="icon" onClick={resetKey} title="Reset from label">
                    <RotateCw className="size-4" />
                  </Button>
                </div>
                {draft.field_key && existingKeys.has(draft.field_key) && (
                  <p className="mt-1 text-xs text-destructive">This key is already used on this form.</p>
                )}
              </div>

              <div>
                <Label>Display width (desktop)</Label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(["full", "half", "third"] as DisplayWidth[]).map((w) => (
                    <button key={w} type="button"
                      onClick={() => setField("display_width", w)}
                      className={`rounded-md border px-3 py-2 text-sm capitalize ${
                        draft.display_width === w
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted"
                      }`}>{w}</button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Mobile always shows full width.</p>
              </div>

              {hasOptions && (
                <div>
                  <Label>Options</Label>
                  <div className="space-y-1.5">
                    {(draft.validation.options ?? []).map((o, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={o.label} placeholder="Label"
                          onChange={(e) => {
                            const next = [...(draft.validation.options ?? [])];
                            next[i] = { ...o, label: e.target.value, value: o.value || slugifyKey(e.target.value) };
                            setRule({ options: next });
                          }} />
                        <Button type="button" variant="ghost" size="icon"
                          onClick={() => {
                            const next = (draft.validation.options ?? []).filter((_, j) => j !== i);
                            setRule({ options: next });
                          }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => setRule({ options: [...(draft.validation.options ?? []), { value: `opt_${(draft.validation.options ?? []).length + 1}`, label: "Option" }] })}>
                      <Plus className="mr-1 size-4" /> Add option
                    </Button>
                  </div>
                </div>
              )}

              {isText && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Min length</Label>
                    <Input type="number" value={draft.validation.minLength ?? ""}
                      onChange={(e) => setRule({ minLength: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <Label>Max length</Label>
                    <Input type="number" value={draft.validation.maxLength ?? ""}
                      onChange={(e) => setRule({ maxLength: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
              )}

              {isNumber && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Min</Label>
                    <Input type="number" value={draft.validation.min ?? ""}
                      onChange={(e) => setRule({ min: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <Label>Max</Label>
                    <Input type="number" value={draft.validation.max ?? ""}
                      onChange={(e) => setRule({ max: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
              )}

              {isFile && (
                <div>
                  <Label>Max file size (MB)</Label>
                  <Input type="number" value={draft.validation.maxSizeMB ?? ""}
                    onChange={(e) => setRule({ maxSizeMB: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
              )}

              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium">Auto-fill from profile</p>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={(draft.auto_fill.scope === "profile" && draft.auto_fill.source_key) || ""}
                  onChange={(e) => setAutoFill({
                    scope: e.target.value ? "profile" as AutoFillScope : null,
                    source_key: e.target.value || null,
                  })}>
                  <option value="">— None —</option>
                  {PROFILE_SOURCE_KEYS.map((k) => (
                    <option key={k} value={k}>{k.replace(/_/g, " ")}</option>
                  ))}
                </select>
                {draft.auto_fill.scope === "profile" && (
                  <label className="flex items-center justify-between text-sm">
                    <span>Editable after fill</span>
                    <Switch checked={draft.auto_fill.editable_after_fill}
                      onCheckedChange={(c) => setAutoFill({ editable_after_fill: c })} />
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
