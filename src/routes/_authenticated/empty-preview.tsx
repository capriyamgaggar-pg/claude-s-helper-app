import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyFeed } from "@/components/feed/EmptyFeed";
import { defaultIntentExamples, PREVIEW_STAGES, type PreviewStage } from "@/components/brand/examples";
import { isDemoHostBrowser } from "@/lib/demo-client";

export const Route = createFileRoute("/_authenticated/empty-preview")({
  component: EmptyPreviewPage,
});

const INTEREST_OPTIONS = [
  "trekking",
  "travel",
  "startups",
  "sports",
  "photography",
];

function EmptyPreviewPage() {
  const [interests, setInterests] = useState<string[]>([]);
  const [exampleKey, setExampleKey] = useState<string | undefined>(undefined);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [previewAutoRotate, setPreviewAutoRotate] = useState(true);
  const [previewStage, setPreviewStage] = useState<PreviewStage | "auto">("auto");
  const [replayKey, setReplayKey] = useState(0);

  if (!isDemoHostBrowser()) {
    return <Navigate to="/home" replace />;
  }

  const toggleInterest = (i: string) =>
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* chrome */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Empty Feed Preview</h1>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
              Preview
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Hidden dev route for iterating on the empty-feed experience.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] hover:bg-secondary"
        >
          ↻ Replay
        </button>
      </div>

      {/* controls */}
      <div className="mb-6 space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Interests
          </div>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((i) => {
              const active = interests.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleInterest(i)}
                  className={`rounded-full border px-3 py-1 text-[12px] capitalize ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-secondary"
                  }`}
                >
                  {i}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Example
          </div>
          <select
            value={exampleKey ?? ""}
            onChange={(e) => setExampleKey(e.target.value || undefined)}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-[13px]"
          >
            <option value="">Auto-rotate</option>
            {defaultIntentExamples.map((ex) => (
              <option key={ex.slug} value={ex.slug}>
                {ex.emoji} {ex.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stage
          </div>
          <select
            value={previewStage}
            onChange={(e) => setPreviewStage(e.target.value as PreviewStage | "auto")}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-[13px]"
          >
            <option value="auto">Auto (play timeline)</option>
            {PREVIEW_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            Reduced motion
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={previewAutoRotate}
              onChange={(e) => setPreviewAutoRotate(e.target.checked)}
            />
            Auto-rotate examples
          </label>
        </div>
      </div>

      {/* render */}
      <EmptyFeed
        key={replayKey}
        label="Preview Location"
        interests={interests}
        onReset={() => {}}
        preview={{
          exampleKey,
          reducedMotion,
          previewAutoRotate,
          previewStage: previewStage === "auto" ? undefined : previewStage,
          replayKey,
        }}
      />
    </div>
  );
}
