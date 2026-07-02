import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, Flame, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { IntentCard, type IntentCardData } from "@/components/intent-card";
import { Skeleton } from "@/components/ui/skeleton";
import { scoreIntent } from "@/lib/matching";
import { LocationPill } from "@/components/location-pill";
import { useActiveLocation, applyLocationFilter, type Place } from "@/lib/location";
import { canSeeCreator } from "@/lib/creator-visibility";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Intent" }] }),
  component: HomePage,
});

interface IntentRow {
  id: string; title: string; description: string | null;
  category_slug: string; city: string | null; locality: string | null;
  lat: number | null; lng: number | null;
  starts_at: string | null; ends_at: string | null; people_needed: number;
  visibility: string; status: string; expires_at: string | null;
  creator_visibility: string | null;
  tags: string[]; created_at: string;
  creator_id: string;
  intent_categories: { label: string } | null;
  profiles: { name: string | null; photo_url: string | null } | null;
  intent_participants: { user_id: string; state: string }[];
}

function rowToCard(r: IntentRow, viewerId: string): IntentCardData {
  const mine = r.intent_participants.find((p) => p.user_id === viewerId);
  const visible = canSeeCreator({
    creator_id: r.creator_id,
    creator_visibility: r.creator_visibility,
    viewer_id: viewerId,
    viewer_participant_state: mine?.state ?? null,
  });
  return {
    id: r.id,
    title: r.title,
    category_slug: r.category_slug,
    category_label: r.intent_categories?.label ?? r.category_slug,
    city: r.locality && r.city ? `${r.locality}, ${r.city}` : r.city,
    starts_at: r.starts_at,
    people_needed: r.people_needed,
    interested_count: r.intent_participants.length,
    creator_name: r.profiles?.name ?? null,
    creator_photo: r.profiles?.photo_url ?? null,
    creator_visible: visible,
    created_at: r.created_at,
    status: r.status,
    expires_at: r.expires_at,
  };
}

function HomePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { place, setPlace, filter, label } = useActiveLocation();
  const [seededFromProfile, setSeededFromProfile] = useState(false);

  // Onboarding gate + seed location from profile if user hasn't set one
  useEffect(() => {
    supabase.rpc("get_my_profile")
      .then(({ data }) => {
        if (!data || !data.onboarded) {
          navigate({ to: "/onboarding" });
          return;
        }
        if (!place && !seededFromProfile && data.city) {
          const p: Place = {
            locality: data.locality,
            city: data.city,
            state: data.state,
            country: data.country,
            lat: data.lat,
            lng: data.lng,
            place_id: data.place_id,
            label:
              data.locality && data.city
                ? `${data.locality}, ${data.city}`
                : (data.city ?? "Anywhere"),
          };
          setPlace(p);
        }
        setSeededFromProfile(true);
      });
  }, [user.id, navigate, place, seededFromProfile, setPlace]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: intents, isLoading } = useQuery({
    queryKey: ["intents", "feed", filter.scope, filter.city ?? "", filter.locality ?? ""],
    queryFn: async () => {
      let query = supabase
        .from("intents")
        .select(`
          id, title, description, category_slug, city, locality, lat, lng,
          starts_at, ends_at, people_needed, visibility, status, expires_at, tags,
          created_at, creator_id, creator_visibility,
          intent_categories(label),
          profiles!intents_creator_id_fkey(name, photo_url),
          intent_participants(user_id, state)
        `)
        .eq("visibility", "public")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(60);
      query = applyLocationFilter(query, filter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as IntentRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!intents) return null;
    const term = q.trim().toLowerCase();
    if (!term) return intents;
    return intents.filter(
      (i) => i.title.toLowerCase().includes(term)
        || i.description?.toLowerCase().includes(term)
        || i.city?.toLowerCase().includes(term)
        || i.locality?.toLowerCase().includes(term)
        || i.category_slug.toLowerCase().includes(term),
    );
  }, [intents, q]);

  const sections = useMemo(() => {
    if (!filtered) return null;
    const recommended = profile
      ? [...filtered]
          .map((r) => ({
            r,
            s: scoreIntent({
              viewer: {
                interests: profile.interests ?? [],
                city: profile.city,
                pastCategories: [],
              },
              intent: {
                category_slug: r.category_slug,
                city: r.city,
                tags: r.tags ?? [],
                starts_at: r.starts_at,
                creator_id: r.creator_id,
              },
              viewerId: user.id,
            }),
          }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 6)
          .map((x) => x.r)
      : [];

    const trending = [...filtered]
      .filter((r) => r.creator_id !== user.id)
      .sort((a, b) => b.intent_participants.length - a.intent_participants.length)
      .slice(0, 6);

    const recent = filtered.filter((r) => r.creator_id !== user.id).slice(0, 12);

    return { recommended, trending, recent };
  }, [filtered, profile, user.id]);

  const everythingEmpty =
    sections &&
    sections.recommended.length === 0 &&
    sections.trending.length === 0 &&
    sections.recent.length === 0;

  return (
    <div className="px-5 pt-8">
      <header>
        <div className="flex items-center justify-between gap-2">
          <LocationPill place={place} onChange={setPlace} prefix="Showing" />
        </div>
        <h1 className="display mt-4 text-3xl leading-[1.1]">
          What are you trying to do today?
        </h1>
      </header>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search intents, cities, categories…"
          className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {isLoading && (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      )}

      {sections && (
        <div className="space-y-10 pt-8">
          {sections.recommended.length > 0 && (
            <Section title="Recommended for you" Icon={Sparkles} items={sections.recommended} viewerId={user.id} />
          )}
          {sections.trending.length > 0 && (
            <Section title="Trending" Icon={Flame} items={sections.trending} viewerId={user.id} />
          )}
          {sections.recent.length > 0 && (
            <Section title="Just posted" Icon={Clock} items={sections.recent} viewerId={user.id} />
          )}
          {everythingEmpty && <EmptyState label={label} onReset={() => setPlace(null)} />}
        </div>
      )}
    </div>
  );
}

function Section({ title, Icon, items, viewerId }: { title: string; Icon: typeof Search; items: IntentRow[]; viewerId: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((r) => <IntentCard key={r.id} intent={rowToCard(r, viewerId)} />)}
      </div>
    </section>
  );
}

function EmptyState({ label, onReset }: { label: string; onReset: () => void }) {
  const isAnywhere = label === "Anywhere";
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
      <h3 className="display text-xl">Nothing here yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {isAnywhere
          ? "Be the first — post what you're trying to do today."
          : `No intents in ${label} right now.`}
      </p>
      {!isAnywhere && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-[13px] font-medium hover:bg-secondary"
        >
          Show Anywhere
        </button>
      )}
    </div>
  );
}
