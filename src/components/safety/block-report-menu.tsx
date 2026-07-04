import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, ShieldAlert, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const REASONS = [
  { value: "harassment", label: "Harassment or threats" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "spam", label: "Spam" },
  { value: "scam_or_fraud", label: "Scam or fraud" },
  { value: "other", label: "Something else" },
] as const;

interface Props {
  userId: string;
  /** Where to send the person after blocking (they usually shouldn't stay on that profile/chat). */
  onBlocked?: () => void;
  intentId?: string;
  threadId?: string;
}

export function BlockReportMenu({ userId, onBlocked, intentId, threadId }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");

  const block = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("blocked_users").insert({ blocked_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Blocked. They can no longer message you or connect with you.");
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["threads"] });
      if (onBlocked) onBlocked();
      else navigate({ to: "/home" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = useMutation({
    mutationFn: async () => {
      if (!reason) throw new Error("Please choose a reason.");
      const { error } = await supabase.from("reports").insert({
        reported_user_id: userId,
        reason: reason as never,
        details: details.trim() || null,
        intent_id: intentId ?? null,
        thread_id: threadId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report submitted. Thank you for flagging this.");
      setReportOpen(false);
      setReason("");
      setDetails("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="More options">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <ShieldAlert className="mr-2 size-4" /> Report
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmBlockOpen(true)} className="text-destructive focus:text-destructive">
            <ShieldX className="mr-2 size-4" /> Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this person?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to message you or send you connection requests anymore. This won't notify them.
              You can review your blocked list later if you want to undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => block.mutate()} disabled={block.isPending}>
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this person</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Why are you reporting them?" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Anything else we should know? (optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={() => report.mutate()} disabled={report.isPending || !reason}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
