import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/communities/new")({
  head: () => ({ meta: [{ title: "New community — Intent" }] }),
  component: NewCommunity,
});

function NewCommunity() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from("communities").insert({
      organizer_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
    }).select("id").single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Community created");
    navigate({ to: "/communities/$communityId", params: { communityId: data.id } });
  }

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center gap-3">
        <BackButton fallback="/profile/me" />
        <h1 className="display text-2xl">New community</h1>
      </div>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl bg-surface" placeholder="College trekking group" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl bg-surface" placeholder="Who this is for, what you do together." />
        </div>
        <p className="text-[12px] text-muted-foreground">
          Once created, you'll get a link to share directly with people you want in this community —
          anyone with the link can join. It won't show up in search or browsing.
        </p>
        <Button className="h-12 w-full rounded-xl" onClick={create} disabled={busy || !name.trim()}>
          {busy ? "Creating…" : "Create community"}
        </Button>
      </div>
    </div>
  );
}
