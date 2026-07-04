import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronLeft, MapPin, Pencil } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/location-picker";
import { placeLabel, type Place } from "@/lib/location";
import type { CreatorVisibility } from "@/lib/creator-visibility";

const searchSchema = z.object({ expires_at: z.string().optional() });

export const Route = createFileRoute("/_authenticated/intents/$intentId/edit")({
  head: () => ({ meta: [{ title: "Edit intent — Intent" }] }),
  validateSearch: searchSchema,
  component: EditIntent,
});

interface Category { slug: string; label: string }

function EditIntent() {
  const { intentId } = Route.useParams();
  const { expires_at: pendingExpiresAt } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [cats, setCats] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [peopleNeeded, setPeopleNeeded] = useState(1);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [creatorVisibility, setCreatorVisibility] = useState<CreatorVisibility>("public");
  const [visibilityLocked, setVisibilityLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: intent, isLoading } = useQuery({
    queryKey: ["intent-edit", intentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intents")
        .select("*")
        .eq("id", intentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    supabase.from("intent_categories").select("slug,label").order("sort")
      .then(({ data }) => setCats((data ?? []) as Category[]));
  }, []);

  useEffect(() => {
    if (!intent) return;
    setTitle(intent.title);
    setCategory(intent.category_slug);
    setDescription(intent.description ?? "");
    setPeopleNeeded(intent.people_needed);
    setTags((intent.tags ?? []).join(", "));
    setStartsAt(intent.starts_at ? toLocalInput(intent.starts_at) : "");
    setCreatorVisibility((intent.creator_visibility as CreatorVisibility) ?? "public");
    setVisibilityLocked(!!intent.visibility_locked_at);
    if (intent.city) {
      setPlace({
        locality: intent.locality,
        city: intent.city,
        state: intent.state,
        country: intent.country,
        lat: intent.lat,
        lng: intent.lng,
        place_id: intent.place_id,
        label: intent.locality && intent.city ? `${intent.locality}, ${intent.city}` : intent.city,
      });
    }
  }, [intent]);

  if (intent && intent.creator_id !== user.id) {
    return <p className="p-8 text-center text-sm text-muted-foreground">You can't edit this intent.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category) { toast.error("Title and category are required"); return; }
    if (!place) { toast.error("Pick a location"); return; }
    setBusy(true);
    const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const basePatch = {
      title: title.trim(),
      description: description.trim() || null,
      category_slug: category,
      locality: place.locality,
      city: place.city,
      state: place.state,
      country: place.country,
      lat: place.lat,
      lng: place.lng,
      place_id: place.place_id,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      people_needed: peopleNeeded,
      tags: tagArr,
      ...(visibilityLocked ? {} : { creator_visibility: creatorVisibility }),
    };
    const patch = pendingExpiresAt
      ? { ...basePatch, expires_at: pendingExpiresAt, status: "active" as const }
      : basePatch;
    const { error } = await supabase.from("intents").update(patch).eq("id", intentId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(pendingExpiresAt ? "Reactivated with edits" : "Intent updated");
    navigate({ to: "/intents/$intentId", params: { intentId } });
  }

  if (isLoading) return <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 pt-4">
        <BackButton fallback={`/intents/${intentId}`} />
        <h1 className="display text-lg">
          {pendingExpiresAt ? "Edit & reactivate" : "Edit intent"}
        </h1>
      </header>

      <form onSubmit={submit} className="flex-1 space-y-5 px-5 pt-6 pb-10">
        {pendingExpiresAt && (
          <p className="rounded-xl border border-border bg-surface px-3 py-2 text-[12px] text-muted-foreground">
            Reactivating with new visibility until{" "}
            <span className="font-medium text-foreground">
              {new Date(pendingExpiresAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="h-12 rounded-xl bg-surface text-base" />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const on = category === c.slug;
              return (
                <button key={c.slug} type="button" onClick={() => setCategory(c.slug)}
                  className={"rounded-full border px-3.5 py-1.5 text-[13px] " + (on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-foreground hover:bg-secondary")}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <button type="button" onClick={() => setPickerOpen(true)}
            className="flex h-12 w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 text-left">
            <MapPin className="size-4 text-muted-foreground" />
            <span className={"flex-1 truncate text-[15px] " + (place ? "" : "text-muted-foreground")}>
              {place ? placeLabel(place) : "Search area or city"}
            </span>
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
          <LocationPicker open={pickerOpen} onOpenChange={setPickerOpen} allowAnywhere={false}
            title="Where is this happening?" onSelect={(p) => setPlace(p)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="people">People needed</Label>
          <Input id="people" type="number" min={1} max={50} value={peopleNeeded}
            onChange={(e) => setPeopleNeeded(parseInt(e.target.value) || 1)}
            className="h-11 rounded-xl bg-surface" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="starts">When (optional)</Label>
          <Input id="starts" type="datetime-local" value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)} className="h-11 rounded-xl bg-surface" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl bg-surface" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
            className="h-11 rounded-xl bg-surface" />
        </div>

        <div className="space-y-2">
          <Label>Creator visibility</Label>
          <div className="grid grid-cols-1 gap-2">
            {([
              { id: "public",    title: "Show my profile",           desc: "Your name and photo are visible on this intent." },
              { id: "anonymous", title: "Anonymous until connected", desc: "Your identity stays hidden until you accept a connection or someone joins." },
            ] as { id: CreatorVisibility; title: string; desc: string }[]).map((o) => {
              const on = creatorVisibility === o.id;
              return (
                <button key={o.id} type="button"
                  onClick={() => !visibilityLocked && setCreatorVisibility(o.id)}
                  disabled={visibilityLocked}
                  className={"rounded-2xl border p-3 text-left transition-colors " + (on
                    ? "border-foreground bg-foreground/5"
                    : "border-border bg-surface hover:bg-secondary/60") + (visibilityLocked ? " opacity-60 cursor-not-allowed" : "")}>
                  <p className="text-[14px] font-medium">{o.title}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{o.desc}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {visibilityLocked
              ? "Locked — someone has already interacted with this intent."
              : "This locks once the first person interacts with your intent."}
          </p>
        </div>

        <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={busy}>

          {busy ? "Saving…" : pendingExpiresAt ? "Save & reactivate" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
