import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { interestEmoji } from "@/lib/interest-emoji";
import { randomPick, PROFILE_SAVED_MESSAGES } from "@/lib/personality";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({ meta: [{ title: "Edit profile — Intent" }] }),
  component: EditProfile,
});

const SUGGESTED = [
  "Travel", "Trekking", "Startups", "Music", "Tech", "Reading", "Food",
  "Fitness", "Cycling", "Photography", "Cinema", "Coffee", "Yoga", "Badminton", "Football",
];

function EditProfile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [profession, setProfession] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_my_profile");
      if (error) { toast.error(error.message); setLoaded(true); return; }
      if (data) {
        setName(data.name ?? "");
        if (data.city) {
          setPlace({
            locality: data.locality ?? null,
            city: data.city,
            state: data.state ?? null,
            country: data.country ?? null,
            lat: data.lat ?? null,
            lng: data.lng ?? null,
            place_id: data.place_id ?? null,
            label: data.locality && data.city ? `${data.locality}, ${data.city}` : data.city,
          });
        }
        setProfession(data.profession ?? "");
        setBio(data.bio ?? "");
        setInterests(data.interests ?? []);
        setLinkedin(data.linkedin_url ?? "");
        setInstagram(data.instagram_url ?? "");
      }
      setLoaded(true);
    })();
  }, [user.id]);

  function toggleInterest(i: string) {
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      name: name.trim(),
      locality: place?.locality ?? null,
      city: place?.city ?? null,
      state: place?.state ?? null,
      country: place?.country ?? null,
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      place_id: place?.place_id ?? null,
      profession: profession.trim() || null,
      bio: bio.trim() || null,
      interests,
      linkedin_url: linkedin.trim() || null,
      instagram_url: instagram.trim() || null,
    }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    navigate({ to: "/profile/me" });
  }

  if (!loaded) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <BackButton fallback="/profile/me" />
        <h1 className="text-[15px] font-semibold">Edit profile</h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl bg-surface" placeholder="Jane Doe" />
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
            title="Where are you based?"
            onSelect={(p) => setPlace(p)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profession">Profession (optional)</Label>
          <Input id="profession" value={profession} onChange={(e) => setProfession(e.target.value)}
            className="h-12 rounded-xl bg-surface" placeholder="Product designer" />
        </div>

        <div className="space-y-2">
          <Label>Interests</Label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((i) => {
              const on = interests.includes(i);
              return (
                <button key={i} type="button" onClick={() => toggleInterest(i)}
                  className={"rounded-full border px-4 py-2 text-[13px] transition-colors " + (on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-foreground hover:bg-secondary")}>
                  {interestEmoji(i)} {i}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Short bio (optional)</Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
            className="rounded-xl bg-surface" placeholder="Designer, weekend cyclist, learning Spanish." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn (optional)</Label>
          <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
            className="h-12 rounded-xl bg-surface" placeholder="https://linkedin.com/in/…" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram (optional)</Label>
          <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)}
            className="h-12 rounded-xl bg-surface" placeholder="@handle" />
        </div>
      </div>

      <footer className="sticky bottom-0 border-t border-border bg-surface/90 px-6 py-4 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
        <Button className="h-12 w-full rounded-xl" onClick={save} disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </footer>
    </div>
  );
}
