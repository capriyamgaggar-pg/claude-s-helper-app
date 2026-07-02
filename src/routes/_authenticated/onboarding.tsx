import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/location-picker";
import { placeLabel, type Place } from "@/lib/location";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const SUGGESTED = [
  "Travel","Trekking","Startups","Music","Tech","Reading","Food",
  "Fitness","Cycling","Photography","Cinema","Coffee","Yoga","Badminton","Football",
];

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [profession, setProfession] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [busy, setBusy] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Prefill from existing profile (in case of re-entry)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_my_profile").maybeSingle();
      if (data) {
        if (data.onboarded) { navigate({ to: "/home" }); return; }
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
      setBootstrapped(true);
    })();
  }, [user.id, navigate]);

  function toggleInterest(i: string) {
    setInterests((prev) => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  async function finish() {
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
      onboarded: true,
    }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to Intent");
    navigate({ to: "/home" });
  }

  if (!bootstrapped) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const stepCount = 4;
  const progress = ((step + 1) / stepCount) * 100;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="px-6 pt-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">Step {step + 1} of {stepCount}</p>
      </div>

      <div className="flex-1 px-6 pt-6">
        {step === 0 && (
          <section className="space-y-6">
            <header>
              <h1 className="display text-3xl">What should people call you?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Your name shows up on every intent you create or join.</p>
            </header>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl bg-surface" placeholder="Jane Doe" />
            </div>
          </section>
        )}
        {step === 1 && (
          <section className="space-y-6">
            <header>
              <h1 className="display text-3xl">Where are you based?</h1>
              <p className="mt-2 text-sm text-muted-foreground">So we can show you intents nearby.</p>
            </header>
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
              <Input id="profession" value={profession} onChange={(e) => setProfession(e.target.value)} className="h-12 rounded-xl bg-surface" placeholder="Product designer" />
            </div>
          </section>
        )}
        {step === 2 && (
          <section className="space-y-6">
            <header>
              <h1 className="display text-3xl">What are you into?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Pick a few. We use these to find matches.</p>
            </header>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((i) => {
                const on = interests.includes(i);
                return (
                  <button key={i} type="button" onClick={() => toggleInterest(i)}
                    className={"rounded-full border px-4 py-2 text-[13px] transition-colors " + (on
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-surface text-foreground hover:bg-secondary")}>
                    {i}
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {step === 3 && (
          <section className="space-y-6">
            <header>
              <h1 className="display text-3xl">A bit about you</h1>
              <p className="mt-2 text-sm text-muted-foreground">Two lines is plenty. Add socials if you'd like.</p>
            </header>
            <div className="space-y-2">
              <Label htmlFor="bio">Short bio (optional)</Label>
              <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-xl bg-surface" placeholder="Designer, weekend cyclist, learning Spanish." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn (optional)</Label>
              <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="h-12 rounded-xl bg-surface" placeholder="https://linkedin.com/in/…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram (optional)</Label>
              <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="h-12 rounded-xl bg-surface" placeholder="@handle" />
            </div>
          </section>
        )}
      </div>

      <footer className="sticky bottom-0 border-t border-border bg-surface/90 px-6 py-4 backdrop-blur">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < stepCount - 1 ? (
            <Button
              className="h-12 flex-1 rounded-xl"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !name.trim()}
            >
              Continue
            </Button>
          ) : (
            <Button className="h-12 flex-1 rounded-xl" onClick={finish} disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Done"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// re-export for type compatibility
export { redirect };
