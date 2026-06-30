import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, MapPin, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/location-picker";
import { placeLabel, type Place } from "@/lib/location";

export const Route = createFileRoute("/_authenticated/intents/new")({
  head: () => ({ meta: [{ title: "Create an intent — Intent" }] }),
  component: NewIntent,
});

interface Category { slug: string; label: string }

function NewIntent() {
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("intent_categories").select("slug,label").order("sort")
      .then(({ data }) => setCats((data ?? []) as Category[]));
    supabase.from("profiles")
      .select("locality, city, state, country, lat, lng, place_id")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.city) {
          setPlace({
            locality: data.locality,
            city: data.city,
            state: data.state,
            country: data.country,
            lat: data.lat,
            lng: data.lng,
            place_id: data.place_id,
            label: data.locality && data.city ? `${data.locality}, ${data.city}` : data.city,
          });
        }
      });
  }, [user.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category) { toast.error("Title and category are required"); return; }
    if (!place) { toast.error("Pick a location"); return; }
    setBusy(true);
    const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { data, error } = await supabase.from("intents").insert({
      creator_id: user.id,
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
    }).select("id").single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Intent posted");
    navigate({ to: "/intents/$intentId", params: { intentId: data.id } });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 pt-4">
        <Link to="/home" className="grid size-9 place-items-center rounded-full hover:bg-secondary">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="display text-lg">New intent</h1>
      </header>

      <form onSubmit={submit} className="flex-1 space-y-5 px-5 pt-6">
        <div className="space-y-2">
          <Label htmlFor="title">What are you trying to do?</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="h-12 rounded-xl bg-surface text-base"
            placeholder="Looking for a flatmate in Indiranagar" />
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
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-12 w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 text-left"
          >
            <MapPin className="size-4 text-muted-foreground" />
            <span className={"flex-1 truncate text-[15px] " + (place ? "" : "text-muted-foreground")}>
              {place ? placeLabel(place) : "Search area or city"}
            </span>
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
          <LocationPicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            allowAnywhere={false}
            title="Where is this happening?"
            onSelect={(p) => setPlace(p)}
          />
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
            className="rounded-xl bg-surface"
            placeholder="A bit more context — budget, vibe, who you'd ideally team up with." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated, optional)</Label>
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
            className="h-11 rounded-xl bg-surface" placeholder="quiet, near metro, non-smoker" />
        </div>

        <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={busy}>
          {busy ? "Posting…" : "Post intent"}
        </Button>
      </form>
    </div>
  );
}
