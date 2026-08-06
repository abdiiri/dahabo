import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "gold";
}) {
  const toneClass = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/12 text-destructive",
    gold: "bg-gold/18 text-gold",
  }[tone];

  return (
    <Card className="card-lift gap-0 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", toneClass)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tabular-nums">{value}</p>
      {delta ? (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs font-semibold",
            trend === "up" ? "text-success" : "text-destructive",
          )}
        >
          {trend === "up" ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          {delta}
          <span className="font-normal text-muted-foreground">vs last period</span>
        </p>
      ) : null}
    </Card>
  );
}
