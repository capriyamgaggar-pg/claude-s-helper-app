import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/location-picker";
import { placeLabel, type Place } from "@/lib/location";
import { VisibilityPicker, pickerExpiresAt } from "@/components/visibility-picker";
import { minCustomDateInputValue, type VisibilityPreset } from "@/lib/intent-lifecycle";
import type { JoinMode } from "@/lib/participation";
import type { CreatorVisibility } from "@/lib/creator-visibility";

export const Route = createFileRoute("/_authenticated/intents/new")({
  head: () => ({ meta: [{ title: "Create an intent — Intent" }] }),
  component: NewIntent,
});

interface Category { slug: string; label: string }

// Categories that are typically organizer-driven (one-to-many, ticketed, structured).
const ORGANIZER_CATEGORIES = new Set(["event", "trekking"]);

type ParticipationFlow = "conversation_first" | "registration_first";

function NewIntent() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [cats, setCats] = useState<Category[]>([]);
  const [category, setCategory] = useState("");

  // Shared
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visPreset, setVisPreset] = useState<VisibilityPreset["id"]>("24h");
  const [visCustom, setVisCustom] = useState<string>(minCustomDateInputValue());
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Personal
  const [peopleNeeded, setPeopleNeeded] = useState(1);
  const [joinMode, setJoinMode] = useState<JoinMode>("mutual_confirm");

  // Organizer
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [priceInr, setPriceInr] = useState<string>("");
  const [flow, setFlow] = useState<ParticipationFlow>("conversation_first");

  const [busy, setBusy] = useState(false);

  const isOrganizer = useMemo(
    () => (category ? ORGANIZER_CATEGORIES.has(category) : false),
    [category]
  );

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
    if (isOrganizer && !startsAt) { toast.error("Set a date & time"); return; }

    let expiresAt: string;
    try { expiresAt = pickerExpiresAt(visPreset, visCustom); }
    catch (err) { toast.error((err as Error).message); return; }

    setBusy(true);
    const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const priceNum = priceInr.trim() ? Math.max(0, parseInt(priceInr, 10) || 0) : 0;

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
      people_needed: isOrganizer ? maxParticipants : peopleNeeded,
      tags: tagArr,
      expires_at: expiresAt,
      status: "active",
      join_mode: isOrganizer ? "mutual_confirm" : joinMode,
      participation_mode: isOrganizer ? flow : undefined,
      payment_required: isOrganizer && priceNum > 0,
      price_inr: isOrganizer ? priceNum : 0,
    }).select("id").single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isOrganizer ? "Event created" : "Intent posted");

    // Organizer with registration_first → jump to the Journey/Form builder next.
    if (isOrganizer && flow === "registration_first") {
      navigate({ to: "/intents/$intentId/form", params: { intentId: data.id } });
    } else {
      navigate({ to: "/intents/$intentId", params: { intentId: data.id } });
    }
  }

  const cta = !category ? "Continue" : isOrganizer ? "Create event" : "Create intent";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 pt-4">
        <Link to="/home" className="grid size-9 place-items-center rounded-full hover:bg-secondary">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="display text-lg">
          {isOrganizer ? "New event" : "New intent"}
        </h1>
      </header>

      <form onSubmit={submit} className="flex-1 space-y-5 px-5 pt-6 pb-24">
        {/* Category — first choice; everything else adapts to it */}
        <div className="space-y-2">
          <Label>What kind of intent?</Label>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const on = category === c.slug;
              return (
                <button key={c.slug} type="button" onClick={() => setCategory(c.slug)}
                  className={"rounded-full border px-3.5 py-1.5 text-[13px] transition-colors " + (on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-foreground hover:bg-secondary")}>
                  {c.label}
                </button>
              );
            })}
          </div>
          {category ? (
            <p className="pt-1 text-[12px] text-muted-foreground">
              {isOrganizer
                ? "You're organizing something people can join — we'll show organizer fields."
                : "Personal intent — quick, minimal, mutual by default."}
            </p>
          ) : null}
        </div>

        {category ? (
          <>
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {isOrganizer ? "Event title" : "What are you trying to do?"}
              </Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                className="h-12 rounded-xl bg-surface text-base"
                placeholder={isOrganizer
                  ? "Weekend trek to Kudremukh"
                  : "Looking for a flatmate in Indiranagar"} />
            </div>

            {/* Location — feels like a place, not a text field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Location</Label>
                {place ? (
                  <button type="button" onClick={() => setPickerOpen(true)}
                    className="text-[12px] font-medium text-muted-foreground hover:text-foreground">
                    Change
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-14 w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 text-left"
              >
                <span className="grid size-9 place-items-center rounded-full bg-secondary">
                  <MapPin className="size-4" />
                </span>
                <span className="flex-1 min-w-0">
                  {place ? (
                    <>
                      <span className="block truncate text-[15px] font-medium">{placeLabel(place)}</span>
                      {place.state ? (
                        <span className="block truncate text-[12px] text-muted-foreground">
                          {[place.state, place.country].filter(Boolean).join(", ")}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[15px] text-muted-foreground">Search area or city</span>
                  )}
                </span>
              </button>
              <LocationPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                allowAnywhere={false}
                title="Where is this happening?"
                onSelect={(p) => setPlace(p)}
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="starts">
                {isOrganizer ? "Date & time" : "Starts on (optional)"}
              </Label>
              <Input id="starts" type="datetime-local" value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)} className="h-11 rounded-xl bg-surface" />
            </div>

            {/* People — meaning changes by mode */}
            {isOrganizer ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="max">Maximum participants</Label>
                    <Input id="max" type="number" min={1} max={10000} value={maxParticipants}
                      onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
                      className="h-11 rounded-xl bg-surface" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input id="price" type="number" min={0} value={priceInr}
                      onChange={(e) => setPriceInr(e.target.value)}
                      placeholder="0 = free"
                      className="h-11 rounded-xl bg-surface" />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="people">Looking for</Label>
                <div className="flex items-center gap-2">
                  <Input id="people" type="number" min={1} max={50} value={peopleNeeded}
                    onChange={(e) => setPeopleNeeded(parseInt(e.target.value) || 1)}
                    className="h-11 w-24 rounded-xl bg-surface" />
                  <span className="text-[14px] text-muted-foreground">
                    {peopleNeeded === 1 ? "person" : "people"}
                  </span>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl bg-surface"
                placeholder={isOrganizer
                  ? "What's the plan, itinerary, what to bring, who it's for."
                  : "A bit more context — budget, vibe, who you'd ideally team up with."} />
            </div>

            {/* Organizer: Journey summary card */}
            {isOrganizer ? (
              <div className="space-y-2">
                <Label>Registration journey</Label>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <ul className="space-y-1.5 text-[13px]">
                    <li className="flex items-center justify-between">
                      <span>Registration form</span>
                      <span className="text-muted-foreground">
                        {flow === "registration_first" ? "Required" : "Optional"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Payment</span>
                      <span className="text-muted-foreground">
                        {priceInr && parseInt(priceInr, 10) > 0 ? `₹${priceInr}` : "Free"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Approval</span>
                      <span className="text-muted-foreground">Manual</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Group discussion</span>
                      <span className="text-muted-foreground">After joined</span>
                    </li>
                  </ul>
                  <p className="mt-3 text-[12px] text-muted-foreground">
                    You'll build the full journey right after creating the event.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Advanced */}
            <div className="rounded-2xl border border-border bg-surface">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-[14px] font-medium"
              >
                <span>Advanced</span>
                <ChevronDown className={"size-4 transition-transform " + (advancedOpen ? "rotate-180" : "")} />
              </button>
              {advancedOpen ? (
                <div className="space-y-5 border-t border-border px-4 pb-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags <span className="text-muted-foreground">(comma-separated)</span></Label>
                    <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
                      className="h-11 rounded-xl bg-background" placeholder="quiet, near metro, non-smoker" />
                  </div>

                  <VisibilityPicker
                    value={visPreset}
                    customISO={visCustom}
                    onChange={(p, c) => { setVisPreset(p); setVisCustom(c); }}
                  />

                  {isOrganizer ? (
                    <div className="space-y-2">
                      <Label>Participation flow</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {([
                          { id: "conversation_first", title: "Conversation first", desc: "People express interest and chat before they register. Best for small, curated groups." },
                          { id: "registration_first", title: "Registration first", desc: "Everyone fills the registration form up front. Best for ticketed events, treks, workshops." },
                        ] as { id: ParticipationFlow; title: string; desc: string }[]).map((o) => {
                          const on = flow === o.id;
                          return (
                            <button key={o.id} type="button" onClick={() => setFlow(o.id)}
                              className={"rounded-2xl border p-3 text-left transition-colors " + (on
                                ? "border-foreground bg-foreground/5"
                                : "border-border bg-background hover:bg-secondary/60")}>
                              <p className="text-[14px] font-medium">{o.title}</p>
                              <p className="mt-1 text-[12px] text-muted-foreground">{o.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>How can people join?</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {([
                          { id: "mutual_confirm", title: "Mutual confirmation", desc: "After chatting, both sides confirm before someone is marked as joined." },
                          { id: "open_join",      title: "Open join",           desc: "Anyone you've connected with can join in one tap." },
                        ] as { id: JoinMode; title: string; desc: string }[]).map((o) => {
                          const on = joinMode === o.id;
                          return (
                            <button key={o.id} type="button" onClick={() => setJoinMode(o.id)}
                              className={"rounded-2xl border p-3 text-left transition-colors " + (on
                                ? "border-foreground bg-foreground/5"
                                : "border-border bg-background hover:bg-secondary/60")}>
                              <p className="text-[14px] font-medium">{o.title}</p>
                              <p className="mt-1 text-[12px] text-muted-foreground">{o.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={busy || !category}>
          {busy ? "Posting…" : cta}
        </Button>
      </form>
    </div>
  );
}
