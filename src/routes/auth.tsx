import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmbientNetwork } from "@/components/brand/AmbientNetwork";
import { Wordmark } from "@/components/brand/Wordmark";
import { defaultIntentExamples } from "@/components/brand/examples";
import { useIsMobile } from "@/hooks/use-mobile";
import { DemoAuthPanel } from "@/components/demo/DemoAuthPanel";
import { motion } from "@/lib/motion";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Intent — find your people" },
      {
        name: "description",
        content:
          "A network for shared real-world goals. Post what you need and find people nearby who want the same.",
      },
      { property: "og:title", content: "Intent — find your people" },
      {
        property: "og:description",
        content:
          "Post what you're up for. Meet people nearby who want the same.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Intent — find your people" },
      {
        name: "twitter:description",
        content:
          "Post what you're up for. Meet people nearby who want the same.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = useSearch({ from: "/auth" });
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const safeRedirect = sanitizeRedirect(redirect);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
      window.location.href = safeRedirect;
    });
    return () => { alive = false; };
  }, [safeRedirect]);

  async function onGoogle() {
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) {
        toast.error(res.error.message || "Couldn't sign in with Google. Please try again.");
        setBusy(false);
        return;
      }
      if (res.redirected) return;
      window.location.href = safeRedirect;
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
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          toast.error(error.message);
          setBusy(false);
          return;
        }
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          setBusy(false);
          return;
        }
        window.location.href = safeRedirect;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-background">
      <AmbientNetwork
        examples={defaultIntentExamples}
        variant={isMobile ? "compact" : "full"}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center px-6 pb-10 pt-14">
        <div className={isMobile ? "mt-20" : "mt-10"}>
          <Wordmark size="lg" tagline="A NETWORK FOR REAL WORLD CONNECTION" />
        </div>

        <div className="mt-6">
          <h1
            className="text-[44px] leading-[1.02] tracking-[-0.02em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Where plans find people
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {"\n"}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-foreground/8 bg-surface p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_20px_60px_-30px_rgba(20,20,40,0.10)]">
          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full justify-center gap-3 rounded-xl border-input bg-surface text-[15px] font-medium"
            onClick={onGoogle}
            disabled={busy}
          >
            <GoogleMark />
            Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or use email
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onEmail} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="h-11 rounded-xl bg-surface"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                minLength={6}
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="h-11 rounded-xl bg-surface"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full rounded-xl text-[15px]"
              disabled={busy}
            >
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-3 block w-full text-center text-[13px] text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "First time? Create your account"
              : "Already have an account? Sign in"}
          </button>
        </div>

        <DemoAuthPanel />

        <div className="mt-6 text-center">
          <p className="text-[12px] text-foreground/50">
            Your next connection could change everything.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            By continuing you agree to our Terms and Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}

function sanitizeRedirect(value: string | undefined) {
  if (!value) return "/home";
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/auth")) return value;
  try {
    const url = new URL(value);
    const localPath = `${url.pathname}${url.search}${url.hash}`;
    if (localPath.startsWith("/") && !localPath.startsWith("//") && !localPath.startsWith("/auth")) return localPath;
  } catch {
    // Ignore malformed redirect values.
  }
  return "/home";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.6 14.7 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
