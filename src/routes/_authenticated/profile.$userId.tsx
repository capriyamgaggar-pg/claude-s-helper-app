import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  head: ({ params }) => ({ meta: [{ title: `Profile — ${params.userId.slice(0, 6)}` }] }),
  component: PublicProfile,
});

function PublicProfile() {
  const { userId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: intents } = useQuery({
    queryKey: ["public-intents", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("intents")
        .select("id, title, category_slug, intent_categories(label), created_at")
        .eq("creator_id", userId).eq("visibility", "public")
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const connect = useMutation({
    mutationFn: async () => {
      if (userId === user.id) return;
      const [a, b] = user.id < userId ? [user.id, userId] : [userId, user.id];
      const { error } = await supabase.from("connections")
        .upsert({ user_a: a, user_b: b, requested_by: user.id, state: "requested" },
          { onConflict: "user_a,user_b" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Connection request sent");
      qc.invalidateQueries({ queryKey: ["connections", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!profile) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="px-5 pt-4 pb-8">
      <Link to="/home" className="-ml-2 grid size-9 place-items-center rounded-full hover:bg-secondary">
        <ChevronLeft className="size-5" />
      </Link>

      <div className="mt-2 flex items-center gap-4">
        {profile.photo_url ? (
          <img src={profile.photo_url} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-muted text-xl font-semibold">
            {(profile.name?.[0] ?? "·").toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="display truncate text-2xl">{profile.name ?? "Someone"}</h1>
          {profile.profession && <p className="text-[13px] text-muted-foreground">{profile.profession}</p>}
          {profile.city && <p className="text-[12px] text-muted-foreground">{profile.city}</p>}
        </div>
      </div>

      {profile.bio && <p className="mt-5 text-[14px] leading-relaxed">{profile.bio}</p>}

      {profile.interests?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {profile.interests.map((i: string) => (
            <span key={i} className="rounded-full bg-secondary px-2.5 py-0.5 text-[12px]">{i}</span>
          ))}
        </div>
      )}

      {userId !== user.id && (
        <Button onClick={() => connect.mutate()} disabled={connect.isPending}
          className="mt-6 w-full gap-2 rounded-xl">
          <Sparkle className="size-4" /> Connect
        </Button>
      )}

      <section className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active intents</p>
        <div className="mt-3 space-y-2">
          {(intents ?? []).map((i) => {
            const it = i as { id: string; title: string; category_slug: string; intent_categories: { label: string } | null };
            return (
              <Link key={it.id} to="/intents/$intentId" params={{ intentId: it.id }}
                className="block rounded-2xl border border-border bg-surface p-3 hover:bg-secondary/60">
                <p className="text-[11px] text-muted-foreground">{it.intent_categories?.label ?? it.category_slug}</p>
                <p className="mt-0.5 truncate font-medium">{it.title}</p>
              </Link>
            );
          })}
          {(intents?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No active intents.</p>
          )}
        </div>
      </section>
    </div>
  );
}
