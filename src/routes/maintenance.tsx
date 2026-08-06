import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Scheduled Maintenance | Dahabo Global Logistics" },
      { name: "description", content: "The platform is undergoing scheduled maintenance and will be back shortly." },
      { property: "og:title", content: "Scheduled Maintenance | Dahabo Global Logistics" },
      { property: "og:description", content: "The platform is undergoing scheduled maintenance and will be back shortly." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-warning/15 text-warning"><Wrench className="size-8" /></span>
        <h1 className="mt-6 text-3xl font-extrabold">Scheduled maintenance</h1>
        <p className="mt-3 text-muted-foreground">We're upgrading the operations platform. Tracking and the 24/7 operations desk remain available by phone.</p>
        <Progress value={72} className="mt-6 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">Estimated completion: 02:30 EAT</p>
        <Button className="mt-6" asChild><Link to="/">Back to website</Link></Button>
      </div>
    </div>
  );
}
