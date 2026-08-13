import { useState } from "react";
import { Loader2, FlagTriangleRight } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [endOdometer, setEndOdometer] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!trip) return null;

  const distance = endOdometer > trip.startOdometerKm ? endOdometer - trip.startOdometerKm : 0;

  async function handleSubmit() {
    if (!trip) return;
    if (endOdometer < trip.startOdometerKm) {
      setError(`Ending odometer must be at or above the starting reading (${trip.startOdometerKm.toLocaleString()} km).`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await completeTrip(trip.id, { endOdometerKm: endOdometer });
      if (updated) {
        toast.success(`Trip ${updated.tripCode} completed — ${distance.toLocaleString()} km logged`);
        onCompleted?.(updated);
      }
      setEndOdometer(0);
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
            Starting odometer was {trip.startOdometerKm.toLocaleString()} km. Enter the ending reading — distance and driver pay are calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Ending odometer (km)</Label>
            <Input
              type="number"
              min={trip.startOdometerKm}
              value={endOdometer || ""}
              onChange={(e) => setEndOdometer(Number(e.target.value))}
              placeholder="e.g. 126020"
            />
            {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
          </div>
          {distance > 0 ? (
            <div className="rounded-lg bg-secondary/60 p-3 text-sm">
              <span className="font-semibold">{distance.toLocaleString()} km</span> travelled on this trip.
            </div>
          ) : null}
        </div>

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
