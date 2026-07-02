import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calendar, Clock, MapPin, MessageCircle, PanelsTopLeft, UserRoundCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IntentCardData } from "@/components/intent-card";
import { statusPill } from "@/lib/intent-lifecycle";

export const Route = createFileRoute("/_authenticated/demo-preview")({
  head: () => ({ meta: [{ title: "Demo preview — Intent" }] }),
  component: DemoPreview,
});

type PersonaKey = "discoverer" | "creator" | "organizer";

const personas: Record<PersonaKey, {
  name: string;
  role: string;
  city: string;
  story: string;
  tabs: string[];
}> = {
  discoverer: {
    name: "Isha Verma",
    role: "New member",
    city: "Bengaluru",
    story: "Looking for people to trek, shoot photos, and join weekend plans.",
    tabs: ["Home has recommended intents", "Interested list is active", "Sent request is pending"],
  },
  creator: {
    name: "Kabir Singh",
    role: "Intent creator",
    city: "Mumbai",
    story: "Posted a co-founder intent and is managing interest from relevant people.",
    tabs: ["Active + expired intents", "Received requests", "Chat after mutual consent"],
  },
  organizer: {
    name: "Aarav Sharma",
    role: "Organizer",
    city: "Mumbai",
    story: "Runs an expo booth intent with registration-first participation.",
    tabs: ["Registration form", "Kanban pipeline", "Participant screening"],
  },
};

const cards: Record<PersonaKey, IntentCardData[]> = {
  discoverer: [
    demoCard("11111111-1111-4111-8111-111111111111", "Kudremukh trek — 2 days", "trekking", "Trekking", "Bengaluru", 2, 4),
    demoCard("22222222-2222-4222-8222-222222222222", "Film photography walk", "hobby", "Hobby", "Cubbon Park, Bengaluru", 5, 7),
  ],
  creator: [
    demoCard("33333333-3333-4333-8333-333333333333", "Technical co-founder — fintech for MSMEs", "cofounder", "Co-founder", "Mumbai", 1, 5),
    { ...demoCard("44444444-4444-4444-8444-444444444444", "Founders coffee — Bandra", "networking", "Networking", "Mumbai", 6, 9), status: "expired", expires_at: new Date(Date.now() - 86_400_000).toISOString() },
  ],
  organizer: [
    demoCard("55555555-5555-4555-8555-555555555555", "Booth partner — Yarn Expo Mumbai", "event", "Event / Expo", "Mumbai", 50, 18),
    demoCard("66666666-6666-4666-8666-666666666666", "Sunday long run — 18km", "sports", "Sports", "Pune", 30, 12),
  ],
};

function DemoPreview() {
  const [personaKey, setPersonaKey] = useState<PersonaKey>("discoverer");
  const persona = personas[personaKey];
  const pipeline = useMemo(() => pipelineFor(personaKey), [personaKey]);

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="display text-3xl">Demo preview</h1>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">Preview</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Persona views using safe seeded demo data.</p>
        </div>
        <Link to="/empty-preview" className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium hover:bg-secondary">
          Empty state
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {(Object.keys(personas) as PersonaKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPersonaKey(key)}
            className={`rounded-2xl border px-3 py-2 text-left text-[12px] ${personaKey === key ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-secondary"}`}
          >
            <span className="block font-semibold capitalize">{key}</span>
            <span className="block opacity-70">{personas[key].city}</span>
          </button>
        ))}
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-sm font-semibold">{persona.name[0]}</span>
          <div>
            <h2 className="font-semibold">{persona.name}</h2>
            <p className="text-[12px] text-muted-foreground">{persona.role} · {persona.city}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-foreground">{persona.story}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {persona.tabs.map((tab) => (
            <span key={tab} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">{tab}</span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <UserRoundCheck className="size-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Home / profile cards</h2>
        </div>
        <div className="space-y-3">
          {cards[personaKey].map((card) => <DemoIntentCard key={card.id} intent={card} />)}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <PanelsTopLeft className="size-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Journey pipeline</h2>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {pipeline.map((col) => (
            <div key={col.label} className="rounded-xl bg-background p-2">
              <p className="text-[11px] font-semibold text-muted-foreground">{col.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{col.count}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Inbox states</h2>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <InboxRow label="Received" value={personaKey === "discoverer" ? "0 pending" : "3 pending"} />
          <InboxRow label="Sent" value={personaKey === "creator" ? "1 waiting" : "2 waiting"} />
          <InboxRow label="Chats" value={personaKey === "organizer" ? "5 active" : "1 active"} />
        </div>
      </section>

      <div className="mt-6 flex gap-2">
        <Link to="/home" className="flex-1"><Button className="w-full" variant="outline">Open Home</Button></Link>
        <Link to="/inbox" className="flex-1"><Button className="w-full">Open Inbox</Button></Link>
      </div>
    </div>
  );
}

function demoCard(
  id: string,
  title: string,
  category_slug: string,
  category_label: string,
  city: string,
  people_needed: number,
  interested_count: number,
): IntentCardData {
  return {
    id,
    title,
    category_slug,
    category_label,
    city,
    starts_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    people_needed,
    interested_count,
    creator_name: "Demo creator",
    creator_photo: null,
    creator_visible: true,
    created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    status: "active",
    expires_at: new Date(Date.now() + 22 * 3_600_000).toISOString(),
  };
}

function pipelineFor(persona: PersonaKey) {
  if (persona === "organizer") return [
    { label: "Applied", count: 18 },
    { label: "Shortlisted", count: 9 },
    { label: "Confirmed", count: 5 },
  ];
  if (persona === "creator") return [
    { label: "Interested", count: 5 },
    { label: "Connected", count: 2 },
    { label: "Chat", count: 1 },
  ];
  return [
    { label: "Interested", count: 2 },
    { label: "Pending", count: 2 },
    { label: "Joined", count: 0 },
  ];
}

function InboxRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DemoIntentCard({ intent }: { intent: IntentCardData }) {
  const pill = intent.status ? statusPill(intent.status, intent.expires_at ?? null) : null;
  const toneClass =
    pill?.tone === "amber"
      ? "bg-amber-100 text-amber-900"
      : pill?.tone === "green"
        ? "bg-emerald-100 text-emerald-900"
        : pill?.tone === "grey"
          ? "bg-muted text-muted-foreground"
          : "bg-secondary text-muted-foreground";

  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {intent.category_label}
        </span>
        {pill && (
          <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " + toneClass}>
            <Clock className="size-3" /> {pill.text}
          </span>
        )}
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Demo</span>
      </div>
      <h3 className="display mt-2 text-lg leading-snug text-foreground">{intent.title}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {intent.city && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {intent.city}</span>}
        {intent.starts_at && (
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {new Date(intent.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        <span className="flex items-center gap-1"><Users className="size-3.5" />{intent.interested_count} interested · {intent.people_needed} needed</span>
      </div>
      <div className="mt-3 flex items-center gap-2 pt-1">
        <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">D</span>
        <span className="text-[12px] text-muted-foreground">By Demo creator</span>
      </div>
    </article>
  );
}