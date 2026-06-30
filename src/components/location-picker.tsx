import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation, Globe, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  getCurrentPlace,
  searchPlaces,
  type Place,
} from "@/lib/location";

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with `null` when user picks "Anywhere", a `Place` otherwise. */
  onSelect: (place: Place | null) => void;
  /** Hide the "Anywhere" option (e.g. on Create Intent where a place is required). */
  allowAnywhere?: boolean;
  title?: string;
}

export function LocationPicker({
  open,
  onOpenChange,
  onSelect,
  allowAnywhere = true,
  title = "Choose a location",
}: LocationPickerProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setLoading(false);
      // autofocus after the sheet animation settles
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const handle = setTimeout(async () => {
      try {
        const r = await searchPlaces(term, ctrl.signal);
        if (!ctrl.signal.aborted) setResults(r);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [q, open]);

  async function handleUseCurrent() {
    setLocating(true);
    try {
      const place = await getCurrentPlace();
      onSelect(place);
      onOpenChange(false);
    } catch (err) {
      const msg = (err as Error).message || "Couldn't read your location";
      toast.error(msg);
    } finally {
      setLocating(false);
    }
  }

  function pick(place: Place) {
    onSelect(place);
    onOpenChange(false);
  }

  function pickAnywhere() {
    onSelect(null);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] rounded-t-3xl border-t border-border p-0"
      >
        <SheetHeader className="px-5 pt-5 text-left">
          <SheetTitle className="display text-xl">{title}</SheetTitle>
          <SheetDescription className="text-[13px]">
            Search any area or city. Picking a city includes every locality inside it.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try Vesu, Andheri West, Surat…"
              className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        <div className="mt-3 max-h-[60dvh] overflow-y-auto px-2 pb-6">
          <button
            type="button"
            onClick={handleUseCurrent}
            disabled={locating}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-secondary disabled:opacity-60"
          >
            <span className="grid size-9 place-items-center rounded-full bg-foreground text-background">
              {locating ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-medium">Use current location</span>
              <span className="block text-[12px] text-muted-foreground">
                We'll detect your area
              </span>
            </span>
          </button>

          {allowAnywhere && (
            <button
              type="button"
              onClick={pickAnywhere}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-secondary"
            >
              <span className="grid size-9 place-items-center rounded-full bg-secondary text-foreground">
                <Globe className="size-4" />
              </span>
              <span className="flex-1">
                <span className="block text-[14px] font-medium">Anywhere</span>
                <span className="block text-[12px] text-muted-foreground">
                  Don't filter by location
                </span>
              </span>
            </button>
          )}

          {results.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              {results.map((p) => (
                <button
                  key={p.place_id ?? p.label}
                  type="button"
                  onClick={() => pick(p)}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-secondary"
                >
                  <span className="mt-0.5 grid size-9 place-items-center rounded-full bg-secondary text-foreground">
                    <MapPin className="size-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-[14px] font-medium">{p.label}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {[p.city, p.state, p.country].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {q.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              No matches. Try a different spelling.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
