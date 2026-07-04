import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IntentCard, type IntentCardData } from "@/components/intent-card";
import { LocationPill } from "@/components/location-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "@/lib/motion";
import { AnimatePresence, motion as m } from "motion/react";
import { useCardMotion } from "@/lib/card-motion";
import { applyLocationFilter, placeToFilter, type Place } from "@/lib/location";
import { canSeeCreator } from "@/lib/creator-visibility";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explore intents — Intent" },
      { name: "description", content: "Discover what people around you want to do next, and join in." },
      { property: "og:title", content: "Explore intents — Intent" },
      { property: "og:description", content: "Discover what people around you want to do next, and join in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});


interface Cat { slug: string; label: string }

function Explore() {
  const { user } = Route.useRouteContext();
  const [cats, setCats] = useState<Cat[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  // Explore defaults to Anywhere, independent of Home selection.
  const [place, setPlace] = useState<Place | null>(null);
  const filter = placeToFilter(place);

  useEffect(() => {
    supabase.from("intent_categories").select("slug,label").order("sort")
      .then(({ data }) => setCats((data ?? []) as Cat[]));
  }, []);

  const { data: intents } = useQuery({
    queryKey: ["explore", active, filter.scope, filter.city ?? "", filter.locality ?? ""],
    queryFn: async () => {
      let query = supabase.from("intents").select(`
        id, title, category_slug, city, locality, starts_at, people_needed, status, expires_at, created_at, creator_id,
        creator_visibility,
        intent_categories(label),
        profiles!intents_creator_id_fkey(name, photo_url),
        intent_participants(user_id, state)
      `).eq("visibility", "public").eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }).limit(80);
      if (active) query = query.eq("category_slug", active);
      query = applyLocationFilter(query, filter);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (intents ?? []).filter((i: { title: string; city: string | null; locality: string | null }) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return i.title.toLowerCase().includes(t)
      || i.city?.toLowerCase().includes(t)
      || i.locality?.toLowerCase().includes(t);
  });

  return (
    <div className="px-5 pt-8">
      <div className="space-y-1">
        <h1 className="display text-3xl">Explore</h1>
        <p className="text-[13px] text-muted-foreground">
          See what people nearby want to do next.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, city or area"
          className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" />
      </div>


      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
          <LocationPill place={place} onChange={setPlace} />
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
          <div className="-mx-5 overflow-x-auto px-5">
            <div className="flex gap-2 pb-2">
              <Chip on={active === null} onClick={() => setActive(null)}>All</Chip>
              {cats.map((c) => (
                <Chip key={c.slug} on={active === c.slug} onClick={() => setActive(c.slug)}>{c.label}</Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 pb-8">
        {filtered.map((r) => {
          const intent = r as unknown as {
            id: string; title: string; category_slug: string; city: string | null; locality: string | null;
            starts_at: string | null; people_needed: number; status: string; expires_at: string | null;
            created_at: string; creator_id: string; creator_visibility: string | null;
            intent_categories: { label: string } | null;
            profiles: { name: string | null; photo_url: string | null } | null;
            intent_participants: { user_id: string; state: string }[];
          };
          const mine = intent.intent_participants.find((p) => p.user_id === user.id);
          const visible = canSeeCreator({
            creator_id: intent.creator_id,
            creator_visibility: intent.creator_visibility,
            viewer_id: user.id,
            viewer_participant_state: mine?.state ?? null,
          });
          const card: IntentCardData = {
            id: intent.id, title: intent.title,
            category_slug: intent.category_slug,
            category_label: intent.intent_categories?.label ?? intent.category_slug,
            city: intent.locality && intent.city ? `${intent.locality}, ${intent.city}` : intent.city,
            starts_at: intent.starts_at,
            people_needed: intent.people_needed,
            interested_count: intent.intent_participants.length,
            creator_name: intent.profiles?.name ?? null,
            creator_photo: intent.profiles?.photo_url ?? null,
            creator_visible: visible,
            created_at: intent.created_at,
            status: intent.status,
            expires_at: intent.expires_at,
          };
          return <IntentCard key={card.id} intent={card} />;
        })}
        {filtered.length === 0 && (
          <EmptyState
            icon={<Compass className="size-6" />}
            title="Nothing here yet"
            description="Try another location or category — or be the first to post an intent here."
            action={{ label: "Post an intent", href: "/intents/new" }}
          />
        )}
      </div>
      <Link to="/intents/new" className="hidden">+</Link>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{ transition: motion.transition("background-color, color, border-color", "quick") }}
      className={"shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] " + (on
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-surface text-foreground hover:bg-secondary")}>
      {children}
    </button>
  );
}

