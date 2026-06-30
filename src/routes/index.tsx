import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Intent — find people who share your goal" },
      { name: "description", content: "A network for shared real-world intentions, not a social feed." },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let done = false;
    const go = (to: "/home" | "/auth") => {
      if (done) return;
      done = true;
      navigate({ to, replace: true });
    };
    supabase.auth.getSession().then(({ data }) => {
      go(data.session ? "/home" : "/auth");
    }).catch(() => go("/auth"));
    // Safety fallback if session check stalls
    const t = setTimeout(() => go("/auth"), 1500);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <p className="text-sm opacity-60">Loading…</p>
    </div>
  );
}
