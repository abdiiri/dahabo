import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Access Denied | Dahabo Global Logistics" },
      { name: "description", content: "You do not have permission to view this page. Contact your administrator for access." },
      { property: "og:title", content: "Access Denied | Dahabo Global Logistics" },
      { property: "og:description", content: "You do not have permission to view this page. Contact your administrator for access." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-destructive/12 text-destructive"><ShieldAlert className="size-8" /></span>
        <h1 className="mt-6 text-3xl font-extrabold">403 — Access denied</h1>
        <p className="mt-3 text-muted-foreground">Your role does not include permission for this module. Contact your workspace administrator to request access.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><Link to="/staff">Back to dashboard</Link></Button>
          <Button variant="outline" asChild><Link to="/contact">Contact support</Link></Button>
        </div>
      </div>
    </div>
  );
}
