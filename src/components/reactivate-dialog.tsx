import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisibilityPicker, pickerExpiresAt } from "@/components/visibility-picker";
import { minCustomDateInputValue, type VisibilityPreset } from "@/lib/intent-lifecycle";

interface Props {
  intentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function ReactivateDialog({ intentId, open, onOpenChange, onDone }: Props) {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<VisibilityPreset["id"]>("24h");
  const [customISO, setCustomISO] = useState<string>(minCustomDateInputValue());
  const [busy, setBusy] = useState(false);

  async function reactivateNow() {
    let expiresAt: string;
    try {
      expiresAt = pickerExpiresAt(preset, customISO);
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("intents")
      .update({ status: "active", expires_at: expiresAt })
      .eq("id", intentId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Intent reactivated");
    onOpenChange(false);
    onDone();
  }

  function editAndReactivate() {
    // Pass chosen expiry through search params; edit form will apply on save.
    try {
      const expiresAt = pickerExpiresAt(preset, customISO);
      onOpenChange(false);
      navigate({
        to: "/intents/$intentId/edit",
        params: { intentId },
        search: { expires_at: expiresAt },
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reactivate this intent</DialogTitle>
          <DialogDescription>
            Choose a new visibility period. You can also edit details before reactivating.
          </DialogDescription>
        </DialogHeader>
        <VisibilityPicker
          value={preset}
          customISO={customISO}
          onChange={(p, c) => { setPreset(p); setCustomISO(c); }}
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={editAndReactivate} disabled={busy}>
            Edit & reactivate
          </Button>
          <Button onClick={reactivateNow} disabled={busy}>
            {busy ? "Reactivating…" : "Reactivate now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
