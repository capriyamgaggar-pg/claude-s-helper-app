import { Link } from "@tanstack/react-router";
import { X, ListChecks, Heart, CheckCircle2, Users, Pencil, ShieldX, PlusCircle, LogOut } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export function ProfileDrawer({ open, onClose, onSignOut }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="relative flex h-full w-[78%] max-w-[300px] flex-col gap-1 bg-surface p-5 shadow-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
        <div className="mb-3 flex items-center justify-between">
          <span className="display text-lg">Menu</span>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-secondary" aria-label="Close menu">
            <X className="size-4" />
          </button>
        </div>

        <DrawerLink to="/profile/activity" search={{ tab: "mine" }} onClick={onClose} icon={ListChecks} label="My intents" />
        <DrawerLink to="/profile/activity" search={{ tab: "interested" }} onClick={onClose} icon={Heart} label="Interested" />
        <DrawerLink to="/profile/activity" search={{ tab: "joined" }} onClick={onClose} icon={CheckCircle2} label="Joined" />
        <DrawerLink to="/profile/activity" search={{ tab: "connections" }} onClick={onClose} icon={Users} label="Connections" highlight />

        <div className="my-2 h-px bg-border" />

        <DrawerLink to="/profile/edit" onClick={onClose} icon={Pencil} label="Edit profile" />
        <DrawerLink to="/communities/new" onClick={onClose} icon={PlusCircle} label="Create a community" />
        <DrawerLink to="/profile/blocked" onClick={onClose} icon={ShieldX} label="Blocked users" />

        <button
          type="button"
          onClick={() => { onClose(); onSignOut(); }}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[14px] hover:bg-secondary"
        >
          <LogOut className="size-[18px] text-muted-foreground" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function DrawerLink({
  to, search, onClick, icon: Icon, label, highlight,
}: {
  to: string;
  search?: Record<string, string>;
  onClick: () => void;
  icon: typeof ListChecks;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      search={search as any}
      onClick={onClick}
      className={
        "flex items-center gap-3 rounded-lg px-2 py-2.5 text-[14px] hover:bg-secondary " +
        (highlight ? "bg-secondary/60" : "")
      }
    >
      <Icon className="size-[18px] text-muted-foreground" />
      {label}
    </Link>
  );
}
