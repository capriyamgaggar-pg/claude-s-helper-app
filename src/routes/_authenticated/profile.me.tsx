import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, MapPin, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoHostBrowser } from "@/lib/demo-client";
import { ReputationPanel } from "@/components/reputation-panel";
import { ProfileDrawer } from "@/components/profile/profile-drawer";
import { ActiveIntentCard, type ActiveIntentCardData } from "@/components/profile/active-intent-card";
import { PromoCard } from "@/components/profile/promo-card";
import { interestEmoji } from "@/lib/interest-emoji";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile/me")({
  head: () => ({ meta: [{ title: "Your profile — Intent" }] }),
  component: MeProfile,
});

function MeProfile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_profile");
      if (error) throw error;
      return data;
    },
  });

  const { data: activeIntents } = useQuery({
    queryKey: ["my-active-intents", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select("id, title, category_slug, intent_categories(label), status, expires_at, starts_at, ends_at, people_needed, locality, city")
        .eq("creator_id", user.id).eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-[color:var(--surface-warm)] px-5 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="display text-2xl">Profile</h1>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="grid size-10 place-items-center rounded-full border border-[color:var(--border-warm)] bg-[color:var(--surface-card)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--accent-peach)_35%,white)]"
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </button>
      </div>

      <header className="mt-4 flex items-center gap-4">
        <div className="relative shrink-0">
          <span
            className="pointer-events-none absolute -inset-1 rounded-full"
            style={{
              boxShadow: `0 0 0 2px color-mix(in oklab, var(--accent-peach) 70%, transparent)`,
              animation: "ring-pulse 3s ease-in-out infinite",
            }}
            aria-hidden
          />
          {profile?.photo_url ? (
            <img src={profile.photo_url} alt="" className="relative size-16 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <span className="relative grid size-16 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--accent-peach)_45%,white)] text-xl font-semibold text-[color:var(--accent-orange)] ring-2 ring-white">
              {(profile?.name?.[0] ?? "·").toUpperCase()}
            </span>
          )}
          <span
            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-[color:var(--surface-warm)]"
            style={{ backgroundColor: "var(--accent-orange)" }}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="display flex items-center gap-1.5 truncate text-2xl font-semibold tracking-tight">
            <span className="truncate">{profile?.name ?? "You"}</span>
            <Sparkles className="size-4 shrink-0" style={{ color: "var(--accent-orange)" }} />
          </h2>
          {profile?.profession && <p className="text-[13px] text-muted-foreground">{profile.profession}</p>}
          {profile?.city && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
              <MapPin className="size-3" />
              {profile.city}
            </p>
          )}
        </div>
      </header>

      {isDemoHostBrowser() && (
        <section className="mt-5 rounded-2xl border border-dashed border-[color:var(--border-warm)] bg-[color:var(--surface-card)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preview tools</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              to="/empty-preview"
              className="rounded-full border border-[color:var(--border-warm)] bg-background px-3 py-1.5 text-[12px] font-medium hover:bg-secondary"
            >
              Empty feed preview
            </Link>
            <Link
              to="/demo-preview"
              className="rounded-full border border-[color:var(--border-warm)] bg-background px-3 py-1.5 text-[12px] font-medium hover:bg-secondary"
            >
              Demo personas
            </Link>
          </div>
        </section>
      )}

      {profile?.bio && <p className="mt-5 text-[14px] leading-relaxed">{profile.bio}</p>}

      {profile?.interests && profile.interests.length > 0 && (
        <section className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.interests.map((i: string) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-warm)] bg-white px-2.5 py-1 text-[12.5px] font-medium"
              >
                <span>{interestEmoji(i)}</span> {i}
              </span>
            ))}
          </div>
        </section>
      )}

      <ReputationPanel userId={user.id} />

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active intents</p>
          <Link
            to="/profile/activity"
            search={{ tab: "mine" }}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--accent-orange)] hover:opacity-80"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="mt-3 space-y-2.5">
          {(activeIntents ?? []).map((it) => {
            const row = it as unknown as {
              id: string; title: string; category_slug: string;
              intent_categories: { label: string } | null;
              starts_at: string | null; ends_at: string | null;
              people_needed: number | null; locality: string | null; city: string | null;
            };
            const data: ActiveIntentCardData = {
              id: row.id,
              title: row.title,
              category_slug: row.category_slug,
              category_label: row.intent_categories?.label ?? null,
              starts_at: row.starts_at,
              ends_at: row.ends_at,
              people_needed: row.people_needed,
              locality: row.locality,
              city: row.city,
            };
            return <ActiveIntentCard key={row.id} intent={data} />;
          })}
          {(activeIntents?.length ?? 0) === 0 && (
            <p className="rounded-2xl border border-dashed border-[color:var(--border-warm)] bg-[color:var(--surface-card)] p-4 text-center text-sm text-muted-foreground">
              No active intents.
            </p>
          )}
        </div>
      </section>

      <PromoCard />

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSignOut={signOut} />
    </div>
  );
}
