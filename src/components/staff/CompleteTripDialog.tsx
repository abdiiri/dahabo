import { useState } from "react";
import { Loader2, FlagTriangleRight } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeTrip } from "@/lib/api/trips";
import type { Trip } from "@/lib/api/types";

export function CompleteTripDialog({
  trip,
  open,
  onOpenChange,
  onCompleted,
}: {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (trip: Trip) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (!trip) return null;

  async function handleSubmit() {
    if (!trip) return;
    setSubmitting(true);
    try {
      const updated = await completeTrip(trip.id);
      if (updated) {
        toast.success(`Trip ${updated.tripCode} completed`);
        onCompleted?.(updated);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error("Couldn't complete trip", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete trip {trip.tripCode}</DialogTitle>
          <DialogDescription>
            Mileage pay of KSh {trip.mileageAmount.toLocaleString()} was already agreed when this trip
            started. Marking it complete records today's date and time as the completion timestamp
            automatically — no odometer reading needed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <FlagTriangleRight className="size-4" />}
            Complete trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
