import { useState } from "react";
import {
  VISIBILITY_PRESETS,
  computeExpiresAt,
  minCustomDateInputValue,
  maxCustomDateInputValue,
  type VisibilityPreset,
} from "@/lib/intent-lifecycle";
import { Input } from "@/components/ui/input";

interface Props {
  value: VisibilityPreset["id"];
  customISO: string;
  onChange: (preset: VisibilityPreset["id"], customISO: string) => void;
  label?: string;
}

export function VisibilityPicker({ value, customISO, onChange, label = "Visible for" }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {VISIBILITY_PRESETS.map((p) => {
          const on = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id, customISO)}
              className={
                "rounded-full border px-3.5 py-1.5 text-[13px] " +
                (on
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface text-foreground hover:bg-secondary")
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {value === "custom" && (
        <Input
          type="datetime-local"
          value={customISO}
          min={minCustomDateInputValue()}
          max={maxCustomDateInputValue()}
          onChange={(e) => onChange("custom", e.target.value)}
          className="h-11 rounded-xl bg-surface"
        />
      )}
      <p className="text-[11px] text-muted-foreground">
        Maximum 90 days. Intent disappears from discovery after this — chats stay.
      </p>
    </div>
  );
}

/** Convenience to read the resulting ISO expires_at from current picker state. */
export function pickerExpiresAt(
  value: VisibilityPreset["id"],
  customISO: string,
): string {
  return computeExpiresAt(value, value === "custom" ? customISO : null);
}
