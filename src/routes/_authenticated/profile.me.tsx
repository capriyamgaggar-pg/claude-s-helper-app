import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoHostBrowser } from "@/lib/demo-client";
import { ReputationPanel } from "@/components/reputation-panel";
import { ProfileDrawer } from "@/components/profile/profile-drawer";
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

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="display text-2xl">Profile</h1>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="grid size-10 place-items-center rounded-full border border-border bg-surface hover:bg-secondary"
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </button>
      </div>

      <header className="mt-4 flex items-center gap-4">
        {profile?.photo_url ? (
          <img src={profile.photo_url} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
            {(profile?.name?.[0] ?? "·").toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="display truncate text-2xl">{profile?.name ?? "You"}</h2>
          {profile?.profession && <p className="text-[13px] text-muted-foreground">{profile.profession}</p>}
          {profile?.city && <p className="text-[12px] text-muted-foreground">{profile.city}</p>}
        </div>
        <Link
          to="/profile/edit"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface hover:bg-secondary"
          aria-label="Edit profile"
        >
          <Pencil className="size-4" />
        </Link>
      </header>

      {isDemoHostBrowser() && (
        <section className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preview tools</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              to="/empty-preview"
              className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-medium hover:bg-secondary"
            >
              Empty feed preview
            </Link>
            <Link
              to="/demo-preview"
              className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-medium hover:bg-secondary"
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
              <span key={i} className="rounded-full bg-secondary px-2.5 py-0.5 text-[12px]">{i}</span>
            ))}
          </div>
        </section>
      )}

      <ReputationPanel userId={user.id} />

      <p className="mt-8 text-center text-[13px] text-muted-foreground">
        Tap the menu icon above for your intents, connections, and settings.
      </p>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSignOut={signOut} />
    </div>
  );
}
