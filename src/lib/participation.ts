// Participation lifecycle helpers.
// Three independent state spaces: intent status, connection state, participation state.

export type ParticipationState = "interested" | "joining" | "confirmed" | "declined" | "left";
export type ConnectionState = "requested" | "accepted" | "declined";
export type JoinMode = "mutual_confirm" | "open_join";

export const STATE_LABELS: Record<ParticipationState, string> = {
  interested: "Interested",
  joining: "Confirmation Pending",
  confirmed: "Joined",
  declined: "Declined",
  left: "Left",
};

export type Stage =
  | "show_interest"
  | "interest_saved"
  | "request_connect"
  | "connect_outgoing"
  | "connect_incoming"
  | "connect_declined"
  | "open_chat"
  | "confirm_outgoing"
  | "confirm_incoming"
  | "joined"
  | "left";

export interface StageInput {
  myParticipation?: { state: ParticipationState; confirm_initiated_by: string | null } | null;
  connection?: { state: ConnectionState; requested_by: string } | null;
  meId: string;
  isCreator: boolean;
}

export function computeStage(input: StageInput): Stage {
  const { myParticipation, connection, meId, isCreator } = input;
  if (isCreator) return "joined";
  if (!myParticipation) return "show_interest";
  if (myParticipation.state === "confirmed") return "joined";
  if (myParticipation.state === "left") return "left";
  if (myParticipation.state === "declined") return "connect_declined";

  if (!connection) return myParticipation.state === "joining" ? "open_chat" : "request_connect";

  if (connection.state === "declined") return "connect_declined";
  if (connection.state === "requested") {
    return connection.requested_by === meId ? "connect_outgoing" : "connect_incoming";
  }
  if (myParticipation.state === "joining") {
    return myParticipation.confirm_initiated_by === meId ? "confirm_outgoing" : "confirm_incoming";
  }
  return "open_chat";
}

export interface CtaSpec {
  label: string;
  variant: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
  hint?: string;
}

export function ctaForStage(stage: Stage): CtaSpec {
  switch (stage) {
    case "show_interest":     return { label: "Show Interest",        variant: "default" };
    case "request_connect":   return { label: "Request to Connect",   variant: "default", hint: "You're marked as interested" };
    case "connect_outgoing":  return { label: "Waiting for their reply…",   variant: "outline", disabled: true };
    case "connect_incoming":  return { label: "Accept Connection",    variant: "default" };
    case "connect_declined":  return { label: "Connection Declined",  variant: "outline", disabled: true };
    case "open_chat":         return { label: "Open Chat",            variant: "default", hint: "Not yet a confirmed participant" };
    case "confirm_outgoing":  return { label: "Waiting for their reply…", variant: "outline", disabled: true, hint: "Awaiting their response" };
    case "confirm_incoming":  return { label: "Accept Participation", variant: "default" };
    case "joined":            return { label: "Joined ✓",             variant: "outline", disabled: true };
    case "left":              return { label: "Show Interest",        variant: "default" };
    case "interest_saved":    return { label: "Request to Connect",   variant: "default" };
  }
}

// Canonical ordered key pair for the connections.(user_a,user_b) unique index.
export function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
