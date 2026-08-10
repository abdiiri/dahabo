import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Wallet, Receipt, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusPill } from "@/components/common/StatusPill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { listMyAdvances, submitUsageReport } from "@/lib/api/driver-advances";
import type { DriverAdvance } from "@/lib/api/types";

export const Route = createFileRoute("/driver/")({
  head: () => ({ meta: [{ title: "My Dashboard | Dahabo Driver Portal" }] }),
  component: Page,
});

function Page() {
  const { profile } = useAuth();
  const [advances, setAdvances] = useState<DriverAdvance[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    listMyAdvances(profile.id).then((rows) => active && setAdvances(rows));
    return () => {
      active = false;
    };
  }, [profile]);

  if (!profile) return null;

  const pending = (advances ?? []).filter((a) => a.status === "pending");
  const totalGiven = (advances ?? []).reduce((sum, a) => sum + a.amount, 0);

  return (
    <>
      <PageHeader
        breadcrumb={["Driver"]}
        title={`Welcome, ${profile.fullName.split(" ")[0]}`}
        description="Money handed to you and what still needs a usage report."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-1.5 p-5 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Wallet className="size-3.5" /> Total received
          </p>
          <p className="text-2xl font-bold">KES {totalGiven.toLocaleString()}</p>
        </Card>
        <Card className="gap-1.5 p-5 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Receipt className="size-3.5" /> Awaiting your report
          </p>
          <p className="text-2xl font-bold">{pending.length}</p>
        </Card>
      </div>

      <Card className="gap-4 p-6 shadow-soft">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cash advances</h2>

        {advances === null ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : advances.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Wallet className="size-8" />
            <p className="text-sm">Nothing recorded yet.</p>
            <p className="text-xs">Money given to you by the office will show up here.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {advances.map((a) => (
              <AdvanceRow
                key={a.id}
                advance={a}
                onReported={(updated) =>
                  setAdvances((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)))
                }
              />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function AdvanceRow({
  advance,
  onReported,
}: {
  advance: DriverAdvance;
  onReported: (a: DriverAdvance) => void;
}) {
  const [reporting, setReporting] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const usageAmount = Number(amount);
    if (!amount || Number.isNaN(usageAmount) || usageAmount < 0) {
      toast.error("Enter how much you used");
      return;
    }
    if (!notes.trim()) {
      toast.error("Add a short note on how it was used");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await submitUsageReport(advance.id, { usageAmount, usageReport: notes.trim() });
      onReported(updated);
      toast.success("Usage report submitted");
      setReporting(false);
    } catch (err) {
      toast.error("Couldn't submit report", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">KES {advance.amount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {advance.purpose || "No purpose noted"} · {new Date(advance.givenAt).toLocaleDateString()}
          </p>
        </div>
        <StatusPill status={advance.status === "reported" ? "Delivered" : "Pending"} />
      </div>

      {advance.status === "reported" ? (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-secondary/50 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          <div>
            <p>
              Used KES {advance.usageAmount?.toLocaleString() ?? "—"} — {advance.usageReport}
            </p>
            {advance.reportedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Reported {new Date(advance.reportedAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </div>
      ) : reporting ? (
        <div className="mt-3 grid gap-2.5">
          <div className="grid gap-1.5">
            <Label htmlFor={`amt-${advance.id}`} className="text-xs">
              How much did you use? (KES)
            </Label>
            <Input
              id={`amt-${advance.id}`}
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(advance.amount)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`notes-${advance.id}`} className="text-xs">
              What was it used for?
            </Label>
            <Textarea
              id={`notes-${advance.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fuel for the Nairobi–Mombasa run, KES 3,500. Balance returned to the office."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit report
            </Button>
            <Button size="sm" variant="outline" onClick={() => setReporting(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setReporting(true)}>
          Report how this was used
        </Button>
      )}
    </li>
  );
}
