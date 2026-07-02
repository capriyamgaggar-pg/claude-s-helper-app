import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Intent" },
      { name: "description", content: "Sign in to Intent to discover people who share your real-world goals." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onGoogle() {
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) {
        toast.error("Couldn't sign in with Google. Please try again.");
        setBusy(false);
        return;
      }
      if (res.redirected) return;
      // session set — go to redirect or home
      navigate({ to: redirect ?? "/home" });
    } catch {
      toast.error("Couldn't sign in with Google.");
      setBusy(false);
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) { toast.error(error.message); setBusy(false); return; }
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { toast.error(error.message); setBusy(false); return; }
        navigate({ to: redirect ?? "/home" });
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-6 py-10">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Intent</span>
        <h1 className="display mt-3 text-4xl leading-[1.05] text-foreground">
          Find people who share your goal.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line">
          Not a feed. Just real-world intentions.{"\u00a0"}{"\n"}
          A network that gets you out there.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full justify-center gap-3 rounded-xl border-input bg-surface text-[15px] font-medium"
          onClick={onGoogle}
          disabled={busy}
        >
          <GoogleMark />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or with email
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onEmail} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required
              className="h-11 rounded-xl bg-surface"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" minLength={6} required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="h-11 rounded-xl bg-surface"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-[15px]" disabled={busy}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="block w-full pt-2 text-center text-[13px] text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.6 14.7 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"/>
    </svg>
  );
}
