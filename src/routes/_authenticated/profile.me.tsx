import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile/me")({
  head: () => ({ meta: [{ title: "Your profile — Intent" }] }),
  component: MeProfile,
});

function MeProfile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: mine } = useQuery({
    queryKey: ["my-intents", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select("id, title, category_slug, status, created_at, intent_categories(label)")
        .eq("creator_id", user.id).order("created_at", { ascending: false });
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
    <div className="px-5 pt-8 pb-8">
      <header className="flex items-center gap-4">
        {profile?.photo_url ? (
          <img src={profile.photo_url} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
            {(profile?.name?.[0] ?? "·").toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="display truncate text-2xl">{profile?.name ?? "You"}</h1>
          {profile?.profession && <p className="text-[13px] text-muted-foreground">{profile.profession}</p>}
          {profile?.city && <p className="text-[12px] text-muted-foreground">{profile.city}</p>}
        </div>
      </header>

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

      <section className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your intents
        </p>
        <div className="mt-3 space-y-2">
          {(mine ?? []).map((i) => {
            const intent = i as { id: string; title: string; status: string; intent_categories: { label: string } | null; category_slug: string };
            return (
              <Link key={intent.id} to="/intents/$intentId" params={{ intentId: intent.id }}
                className="block rounded-2xl border border-border bg-surface p-3 hover:bg-secondary/60">
                <p className="text-[11px] text-muted-foreground">{intent.intent_categories?.label ?? intent.category_slug} · {intent.status}</p>
                <p className="mt-0.5 truncate font-medium">{intent.title}</p>
              </Link>
            );
          })}
          {(mine?.length ?? 0) === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              You haven't posted an intent yet.
            </p>
          )}
        </div>
      </section>

      <Button variant="outline" className="mt-8 w-full gap-2 rounded-xl" onClick={signOut}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </div>
  );
}
