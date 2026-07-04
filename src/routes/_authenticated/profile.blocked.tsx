import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/profile/blocked")({
  head: () => ({ meta: [{ title: "Blocked users — Intent" }] }),
  component: BlockedUsers,
});

function BlockedUsers() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["blocked-users", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("blocked_users")
        .select("id, blocked_id, created_at, profiles:profiles!blocked_users_blocked_id_fkey(id, name, photo_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const unblock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unblocked");
      qc.invalidateQueries({ queryKey: ["blocked-users", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center gap-3">
        <BackButton fallback="/profile/me" />
        <h1 className="display text-2xl">Blocked users</h1>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            You haven't blocked anyone.
          </p>
        )}
        {(data ?? []).map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <Link to="/profile/$userId" params={{ userId: b.blocked_id }}>
              {b.profiles?.photo_url ? (
                <img src={b.profiles.photo_url} alt="" className="size-11 rounded-full object-cover" />
              ) : (
                <span className="grid size-11 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {(b.profiles?.name?.[0] ?? "·").toUpperCase()}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{b.profiles?.name ?? "Someone"}</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => unblock.mutate(b.id)} disabled={unblock.isPending}>
              Unblock
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
