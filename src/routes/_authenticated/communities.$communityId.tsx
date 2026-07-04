import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Share2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/communities/$communityId")({
  head: () => ({ meta: [{ title: "Community — Intent" }] }),
  component: CommunityDetail,
});

function CommunityDetail() {
  const { communityId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: community, isLoading } = useQuery({
    queryKey: ["community", communityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("communities")
        .select("id, name, description, organizer_id").eq("id", communityId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: membership } = useQuery({
    queryKey: ["community-membership", communityId, user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_members")
        .select("user_id").eq("community_id", communityId).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const { data: memberCount } = useQuery({
    queryKey: ["community-member-count", communityId],
    queryFn: async () => {
      const { count, error } = await supabase.from("community_members")
        .select("user_id", { count: "exact", head: true }).eq("community_id", communityId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const isOrganizer = community?.organizer_id === user.id;

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("community_members").insert({ community_id: communityId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You're in!");
      qc.invalidateQueries({ queryKey: ["community-membership", communityId, user.id] });
      qc.invalidateQueries({ queryKey: ["community-member-count", communityId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("community_members")
        .delete().eq("community_id", communityId).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Left the community");
      qc.invalidateQueries({ queryKey: ["community-membership", communityId, user.id] });
      qc.invalidateQueries({ queryKey: ["community-member-count", communityId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied — share it with people you want in this community");
  }

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!community) return <div className="p-6 text-sm text-muted-foreground">Community not found.</div>;

  return (
    <div className="px-5 pt-8 pb-8">
      <BackButton fallback="/profile/me" />

      <h1 className="display mt-3 text-2xl">{community.name}</h1>
      {community.description && <p className="mt-1 text-[14px] text-muted-foreground">{community.description}</p>}

      <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Users className="size-4" /> {memberCount ?? 0} member{memberCount === 1 ? "" : "s"}
      </p>

      <div className="mt-6 flex gap-2">
        {isOrganizer ? (
          <Button variant="outline" className="h-11 flex-1 rounded-xl gap-2" onClick={copyLink}>
            <Share2 className="size-4" /> Copy invite link
          </Button>
        ) : membership ? (
          <Button variant="outline" className="h-11 flex-1 gap-2 rounded-xl" onClick={() => leave.mutate()} disabled={leave.isPending}>
            <LogOut className="size-4" /> Leave community
          </Button>
        ) : (
          <Button className="h-11 flex-1 rounded-xl" onClick={() => join.mutate()} disabled={join.isPending}>
            Join community
          </Button>
        )}
      </div>

      {isOrganizer && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Anyone with this page's link can join — share it directly with the people you want here.
          You can also link intents to this community and require membership to join them.
        </p>
      )}
    </div>
  );
}
