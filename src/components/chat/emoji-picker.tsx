import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// A small, curated set grouped loosely by category -- enough for casual chat
// use without pulling in a heavy emoji-data dependency.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀", "😄", "😊", "😉", "😂", "🥲", "😍", "🤔", "😅", "🙃", "😎", "🥳"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "🙌", "👏", "🙏", "🤝", "💪", "👋", "✌️", "🤞"],
  },
  {
    label: "Hearts",
    emojis: ["❤️", "🔥", "✨", "🎉", "⭐", "💯"],
  },
  {
    label: "Travel & activity",
    emojis: ["🏔️", "🏕️", "🚗", "✈️", "⚽", "🏸", "☕", "🍔", "📍", "📅"],
  },
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Add emoji"
        >
          <Smile className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 p-3">
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                    className="grid size-9 place-items-center rounded-lg text-xl hover:bg-secondary"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
