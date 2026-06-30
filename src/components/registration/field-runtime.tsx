// Renders a single field as an input (used by builder preview and runner).
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { LocationPicker } from "@/components/location-picker";
import { placeLabel, type Place } from "@/lib/location";
import type { FormField } from "@/lib/registration-form";

interface Props {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  error?: string | null;
}

export function FieldRuntime({ field, value, onChange, disabled, error }: Props) {
  if (field.kind === "section") {
    return (
      <div className="border-t border-border pt-4">
        <h3 className="text-base font-semibold">{field.label}</h3>
        {field.description && <p className="mt-1 text-sm text-muted-foreground">{field.description}</p>}
      </div>
    );
  }

  return (
    <div>
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {field.description && <p className="mt-0.5 text-xs text-muted-foreground">{field.description}</p>}
      <div className="mt-1.5">
        <Control field={field} value={value} onChange={onChange} disabled={disabled} />
      </div>
      {field.help_text && !error && <p className="mt-1 text-xs text-muted-foreground">{field.help_text}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Control({ field, value, onChange, disabled }: Omit<Props, "error">) {
  const v = value;
  const set = (x: unknown) => onChange(x);
  const ph = field.placeholder ?? "";

  switch (field.kind) {
    case "short_text":
    case "email":
    case "phone":
      return <Input value={String(v ?? "")} placeholder={ph} disabled={disabled}
        type={field.kind === "email" ? "email" : field.kind === "phone" ? "tel" : "text"}
        onChange={(e) => set(e.target.value)} />;

    case "long_text":
      return <Textarea value={String(v ?? "")} placeholder={ph} disabled={disabled}
        onChange={(e) => set(e.target.value)} rows={4} />;

    case "number":
      return <Input type="number" value={v == null ? "" : String(v)} placeholder={ph} disabled={disabled}
        onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))} />;

    case "date":
      return <Input type="date" value={String(v ?? "")} disabled={disabled} onChange={(e) => set(e.target.value)} />;
    case "time":
      return <Input type="time" value={String(v ?? "")} disabled={disabled} onChange={(e) => set(e.target.value)} />;
    case "datetime":
      return <Input type="datetime-local" value={String(v ?? "")} disabled={disabled} onChange={(e) => set(e.target.value)} />;

    case "dropdown": {
      const opts = field.validation?.options ?? [];
      return (
        <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={String(v ?? "")} disabled={disabled} onChange={(e) => set(e.target.value)}>
          <option value="">{ph || "Choose…"}</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }

    case "radio": {
      const opts = field.validation?.options ?? [];
      return (
        <div className="space-y-1.5">
          {opts.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input type="radio" disabled={disabled} checked={v === o.value}
                onChange={() => set(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      );
    }

    case "checkbox_multi": {
      const opts = field.validation?.options ?? [];
      const arr = Array.isArray(v) ? (v as string[]) : [];
      return (
        <div className="space-y-1.5">
          {opts.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={arr.includes(o.value)} disabled={disabled}
                onCheckedChange={(c) => {
                  if (c) set([...arr, o.value]);
                  else set(arr.filter((x) => x !== o.value));
                }} />
              {o.label}
            </label>
          ))}
        </div>
      );
    }

    case "yes_no":
      return (
        <div className="flex items-center gap-2">
          <Switch checked={!!v} disabled={disabled} onCheckedChange={(c) => set(c)} />
          <span className="text-sm text-muted-foreground">{v ? "Yes" : "No"}</span>
        </div>
      );

    case "file_upload":
    case "image_upload":
      return (
        <Input type="file" disabled={disabled}
          accept={field.kind === "image_upload" ? "image/*" : undefined}
          onChange={(e) => set(e.target.files?.[0] ?? null)} />
      );

    case "location":
      return <LocationField value={v as Place | null} onChange={set} disabled={disabled} placeholder={ph || "Pick a location"} />;

    case "payment_reference":
      return (
        <div className="space-y-2">
          <Input value={String((v as { ref?: string } | null)?.ref ?? "")}
            placeholder={ph || "UTR / Transaction ID"} disabled={disabled}
            onChange={(e) => set({ ...(v as object ?? {}), ref: e.target.value })} />
          <Input type="file" accept="image/*" disabled={disabled}
            onChange={(e) => set({ ...(v as object ?? {}), proof: e.target.files?.[0] ?? null })} />
        </div>
      );

    case "emergency_contact": {
      const c = (v as { name?: string; relation?: string; phone?: string } | null) ?? {};
      return (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Input value={c.name ?? ""} placeholder="Name" disabled={disabled}
            onChange={(e) => set({ ...c, name: e.target.value })} />
          <Input value={c.relation ?? ""} placeholder="Relation" disabled={disabled}
            onChange={(e) => set({ ...c, relation: e.target.value })} />
          <Input value={c.phone ?? ""} placeholder="Phone" type="tel" disabled={disabled}
            onChange={(e) => set({ ...c, phone: e.target.value })} />
        </div>
      );
    }

    case "terms":
      return (
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={!!v} disabled={disabled} onCheckedChange={(c) => set(!!c)} />
          <span>{field.help_text ?? "I accept the terms."}</span>
        </label>
      );

    default:
      return <p className="text-xs text-muted-foreground">Unsupported field.</p>;
  }
}

function LocationField({ value, onChange, disabled, placeholder }: {
  value: Place | null; onChange: (p: Place | null) => void; disabled?: boolean; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm disabled:opacity-50">
        <MapPin className="size-4 text-muted-foreground" />
        <span className={value ? "" : "text-muted-foreground"}>
          {value ? placeLabel(value) : placeholder}
        </span>
      </button>
      <LocationPicker open={open} onOpenChange={setOpen} allowAnywhere={false}
        title="Pick a location"
        onSelect={(p) => { onChange(p); setOpen(false); }} />
    </>
  );
}
