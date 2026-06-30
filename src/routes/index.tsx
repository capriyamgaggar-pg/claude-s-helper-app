import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Intent — find people who share your goal" },
      { name: "description", content: "A network for shared real-world intentions, not a social feed." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
