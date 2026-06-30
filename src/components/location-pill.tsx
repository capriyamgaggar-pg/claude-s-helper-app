import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { LocationPicker } from "./location-picker";
import { placeLabel, type Place } from "@/lib/location";

interface LocationPillProps {
  place: Place | null;
  onChange: (p: Place | null) => void;
  /** Prefix shown before the label, e.g. "Showing" */
  prefix?: string;
  className?: string;
}

export function LocationPill({ place, onChange, prefix, className }: LocationPillProps) {
  const [open, setOpen] = useState(false);
  const label = placeLabel(place);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary " +
          (className ?? "")
        }
      >
        <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      <LocationPicker open={open} onOpenChange={setOpen} onSelect={onChange} />
    </>
  );
}
