import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  Delivered: "bg-success/12 text-success ring-success/25",
  Paid: "bg-success/12 text-success ring-success/25",
  Settled: "bg-success/12 text-success ring-success/25",
  Active: "bg-success/12 text-success ring-success/25",
  Available: "bg-success/12 text-success ring-success/25",
  "In Transit": "bg-chart-4/15 text-chart-4 ring-chart-4/25",
  "On Route": "bg-chart-4/15 text-chart-4 ring-chart-4/25",
  Processing: "bg-chart-4/15 text-chart-4 ring-chart-4/25",
  Pending: "bg-warning/15 text-warning ring-warning/30",
  "At Warehouse": "bg-warning/15 text-warning ring-warning/30",
  Maintenance: "bg-warning/15 text-warning ring-warning/30",
  Idle: "bg-muted text-muted-foreground ring-border",
  "Off Duty": "bg-muted text-muted-foreground ring-border",
  Delayed: "bg-destructive/12 text-destructive ring-destructive/25",
  Overdue: "bg-destructive/12 text-destructive ring-destructive/25",
  Suspended: "bg-destructive/12 text-destructive ring-destructive/25",
  "On Hold": "bg-destructive/12 text-destructive ring-destructive/25",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        map[status] ?? "bg-secondary text-secondary-foreground ring-border",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
