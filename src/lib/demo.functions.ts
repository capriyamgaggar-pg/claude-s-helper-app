import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";

export const DEMO_PERSONAS = ["discoverer", "creator", "organizer", "community"] as const;
export type DemoPersona = (typeof DEMO_PERSONAS)[number];

type PersonaSpec = {
  id: string;
  email: string;
  name: string;
  city: string;
  bio: string;
  role: "admin" | "organizer" | "user";
};

const PERSONAS: Record<DemoPersona, PersonaSpec> = {
  discoverer: {
    id: "d15c0000-0000-4000-8000-000000000001",
    email: "demo.discoverer@intentdemo.app",
    name: "Diya (Discoverer)",
    city: "Bengaluru",
    bio: "Exploring what people are up to nearby.",
    role: "user",
  },
  creator: {
    id: "c8ea7000-0000-4000-8000-000000000002",
    email: "demo.creator@intentdemo.app",
    name: "Kabir (Creator)",
    city: "Bengaluru",
    bio: "Starts things. Rides, jams, weekend plans.",
    role: "user",
  },
  organizer: {
    id: "06941e00-0000-4000-8000-000000000003",
    email: "demo.organizer@intentdemo.app",
    name: "Aarohi (Organizer)",
    city: "Bengaluru",
    bio: "Runs meetups. Curates guest lists.",
    role: "organizer",
  },
  community: {
    id: "c0117000-0000-4000-8000-000000000004",
    email: "demo.community@intentdemo.app",
    name: "Ravi (Community)",
    city: "Bengaluru",
    bio: "Regular at trails and cofounder mixers.",
    role: "user",
  },
};

// IMPORTANT: Lovable's published (public, live) apps also live on *.lovable.app —
// the same domain family as ephemeral preview links. This function grants
// admin-privileged demo account creation and passwordless sign-in, so matching
// on domain suffix alone would let ANY visitor to the real production site
// self-provision and log in as a demo user. Ephemeral preview links use a
// distinct "id-preview--" hostname prefix, so we match on that instead.
function isDemoHost(host: string | null): boolean {
  if (!host) return false;
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("id-preview--")
  );
}

async function assertDemoHost() {
  const host = getRequestHost();
  if (!isDemoHost(host)) {
    throw new Error("Demo endpoints are disabled on this host.");
  }
}

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Ensure the auth user exists with fixed UUID + demo metadata. Idempotent.
async function ensurePersonaUser(
  admin: Awaited<ReturnType<typeof loadAdmin>>,
  persona: DemoPersona,
) {
  const spec = PERSONAS[persona];
  // Random per-provisioning password (never returned to client)
  const password = crypto.randomUUID() + crypto.randomUUID();

  // Try create with fixed id; if already exists, update metadata + password so sign-in stays possible.
  const created = await admin.auth.admin.createUser({
    id: spec.id,
    email: spec.email,
    password,
    email_confirm: true,
    user_metadata: { name: spec.name, demo: true, demo_persona: persona },
  });

  if (created.error) {
    // Likely already exists — update instead.
    const upd = await admin.auth.admin.updateUserById(spec.id, {
      email: spec.email,
      password,
      email_confirm: true,
      user_metadata: { name: spec.name, demo: true, demo_persona: persona },
    });
    if (upd.error) {
      throw new Error(`Provision ${persona} failed: ${upd.error.message}`);
    }
  }

  // Upsert profile.
  await admin.from("profiles").upsert(
    {
      id: spec.id,
      name: spec.name,
      city: spec.city,
      locality: spec.city,
      bio: spec.bio,
      onboarded: true,
    },
    { onConflict: "id" },
  );

  // Ensure role.
  await admin
    .from("user_roles")
    .upsert({ user_id: spec.id, role: spec.role }, { onConflict: "user_id,role" });
}

async function seedIntents(admin: Awaited<ReturnType<typeof loadAdmin>>) {
  const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
  const rows = [
    {
      id: "11117000-0000-4000-8000-000000000001",
      creator_id: PERSONAS.creator.id,
      title: "Sunrise ride to Nandi Hills — Saturday 5am",
      description:
        "Small group, easy pace. Coffee at the top, back by 10. Bring lights + a windbreaker.",
      category_slug: "sports",
      city: "Bengaluru",
      tags: ["cycling", "weekend"],
      people_needed: 4,
      status: "active",
      expires_at: daysFromNow(10),
    },
    {
      id: "11117000-0000-4000-8000-000000000002",
      creator_id: PERSONAS.creator.id,
      title: "Jam partner wanted — indie / lofi",
      description:
        "Home setup in Koramangala. Vocals + guitar preferred. Casual, weekly evenings.",
      category_slug: "hobby",
      city: "Bengaluru",
      tags: ["music", "jam"],
      people_needed: 1,
      status: "active",
      expires_at: daysFromNow(12),
    },
    {
      id: "11117000-0000-4000-8000-000000000003",
      creator_id: PERSONAS.organizer.id,
      title: "Founders coffee — Sunday 10am, Indiranagar",
      description:
        "6 seats. Short intros, then unstructured. Registration required — quick form so seats go to relevant folks.",
      category_slug: "networking",
      city: "Bengaluru",
      tags: ["founders", "meetup"],
      people_needed: 6,
      participation_mode: "registration_first",
      approval_required: true,
      status: "active",
      expires_at: daysFromNow(9),
    },
    {
      id: "11117000-0000-4000-8000-000000000004",
      creator_id: PERSONAS.community.id,
      title: "Weekday trail walk — Turahalli",
      description: "90 mins, post-work. Meet at the gate. Rain cancels.",
      category_slug: "trekking",
      city: "Bengaluru",
      tags: ["outdoors", "evening"],
      people_needed: 3,
      status: "active",
      expires_at: daysFromNow(7),
    },
    {
      id: "11117000-0000-4000-8000-000000000005",
      creator_id: PERSONAS.discoverer.id,
      title: "Flatmate in HSR — move in next month",
      description: "2BHK, quiet, WFH friendly. Looking for one more. Non-smoker.",
      category_slug: "flatmate",
      city: "Bengaluru",
      tags: ["hsr", "flatmate"],
      people_needed: 1,
      status: "active",
      expires_at: daysFromNow(14),
    },
    {
      id: "11117000-0000-4000-8000-000000000006",
      creator_id: PERSONAS.creator.id,
      title: "Weekend trip to Coorg — 2 spots in the car",
      description:
        "Leaving Friday night, back Sunday evening. Splitting fuel + stay. Homestay booked.",
      category_slug: "travel",
      city: "Bengaluru",
      tags: ["roadtrip", "weekend"],
      people_needed: 2,
      status: "active",
      expires_at: daysFromNow(8),
    },
    {
      id: "11117000-0000-4000-8000-000000000007",
      creator_id: PERSONAS.organizer.id,
      title: "Design critique night — bring one project",
      description:
        "10 designers, structured feedback rounds. Free, but RSVP so we know numbers.",
      category_slug: "event",
      city: "Bengaluru",
      tags: ["design", "critique"],
      people_needed: 10,
      participation_mode: "registration_first",
      status: "active",
      expires_at: daysFromNow(11),
    },
    {
      id: "11117000-0000-4000-8000-000000000008",
      creator_id: PERSONAS.community.id,
      title: "Study buddy for GRE — evenings, Jayanagar",
      description:
        "Aiming for December. 2 hours, 4 evenings a week. Library or cafe, alternating.",
      category_slug: "study",
      city: "Bengaluru",
      tags: ["gre", "study"],
      people_needed: 1,
      status: "active",
      expires_at: daysFromNow(14),
    },
    {
      id: "11117000-0000-4000-8000-000000000009",
      creator_id: PERSONAS.creator.id,
      title: "Cofounder for a small dev tool — technical",
      description:
        "Early stage, self-funded runway. Looking for a builder who's shipped before. Chat first, no pressure.",
      category_slug: "cofounder",
      city: "Bengaluru",
      tags: ["startup", "technical"],
      people_needed: 1,
      status: "active",
      expires_at: daysFromNow(14),
    },
    {
      id: "11117000-0000-4000-8000-000000000010",
      creator_id: PERSONAS.discoverer.id,
      title: "Pottery workshop — split a private class",
      description:
        "Instructor quoted for 4. Have 2, need 2 more. Saturday afternoon, Cooke Town.",
      category_slug: "hobby",
      city: "Bengaluru",
      tags: ["workshop", "pottery"],
      people_needed: 2,
      status: "active",
      expires_at: daysFromNow(6),
    },
    {
      id: "11117000-0000-4000-8000-000000000011",
      creator_id: PERSONAS.community.id,
      title: "Board games night at my place — casual",
      description: "Catan, Codenames, Splendor. Snacks provided. 6 seats, first come.",
      category_slug: "event",
      city: "Bengaluru",
      tags: ["boardgames", "friday"],
      people_needed: 6,
      status: "active",
      expires_at: daysFromNow(5),
    },
    {
      id: "11117000-0000-4000-8000-000000000012",
      creator_id: PERSONAS.organizer.id,
      title: "Sunday morning run — 5k easy, Cubbon Park",
      description: "No pace pressure. Coffee after at Matteo. Bring a friend.",
      category_slug: "sports",
      city: "Bengaluru",
      tags: ["running", "sunday"],
      people_needed: 8,
      status: "active",
      expires_at: daysFromNow(4),
    },
  ];
  for (const r of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await admin.from("intents").upsert(r as any, { onConflict: "id" });
  }
}

// ---------- Server functions ----------

export const initializeDemo = createServerFn({ method: "POST" }).handler(async () => {
  await assertDemoHost();
  const admin = await loadAdmin();
  for (const p of DEMO_PERSONAS) {
    await ensurePersonaUser(admin, p);
  }
  await seedIntents(admin);
  return { ok: true, personas: DEMO_PERSONAS };
});

export const demoSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: { persona: DemoPersona }) => {
    const parsed = z.object({ persona: z.enum(DEMO_PERSONAS) }).parse(d);
    return parsed;
  })
  .handler(async ({ data }) => {
    await assertDemoHost();
    const admin = await loadAdmin();
    const spec = PERSONAS[data.persona];

    // Make sure the user exists before minting a link.
    await ensurePersonaUser(admin, data.persona);

    const { data: link, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: spec.email,
    });
    if (error || !link?.properties?.hashed_token) {
      throw new Error(error?.message ?? "Failed to mint demo link");
    }
    return {
      email: spec.email,
      token_hash: link.properties.hashed_token,
      persona: data.persona,
    };
  });

export const resetDemo = createServerFn({ method: "POST" }).handler(async () => {
  await assertDemoHost();
  const admin = await loadAdmin();
  const ids = Object.values(PERSONAS).map((p) => p.id);
  // Wipe demo intents (cascade should clear participants/threads).
  await admin.from("intents").delete().in("creator_id", ids);
  await seedIntents(admin);
  return { ok: true };
});

export const listDemoPersonas = createServerFn({ method: "GET" }).handler(async () => {
  await assertDemoHost();
  return DEMO_PERSONAS.map((p) => ({
    persona: p,
    name: PERSONAS[p].name,
    role: PERSONAS[p].role,
    id: PERSONAS[p].id,
  }));
});
