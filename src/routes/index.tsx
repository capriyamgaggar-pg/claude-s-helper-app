import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Intent — find people who share your goal" },
      { name: "description", content: "A network for shared real-world intentions, not a social feed." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/home" });
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
