import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { branches } from "@/data/mock";

export const Route = createFileRoute("/staff/company")({
  head: () => ({
    meta: [
      { title: "Company Profile | Dahabo Staff Portal" },
      { name: "description", content: "Legal entity details, tax registration and branch directory." },
      { property: "og:title", content: "Company Profile | Dahabo Staff Portal" },
      { property: "og:description", content: "Legal entity details, tax registration and branch directory." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Staff", "Company Profile"]} title="Company profile" description="Legal, tax and branch information." actions={<Button>Save changes</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="grid gap-4 p-6 shadow-soft sm:grid-cols-2">
          {[["Legal name", "Dahabo Global Logistics Ltd"], ["Registration no.", "PVT-KE-2011-44821"], ["KRA PIN", "P051" + "234567X"], ["VAT number", "0184472K"], ["Head office", "Enterprise Road, Nairobi"], ["Operations email", "ops@dahaboglobal.com"]].map(([l, v]) => (
            <div key={l} className="grid gap-2"><Label>{l}</Label><Input defaultValue={v} /></div>
          ))}
        </Card>
        <Card className="gap-2 p-6 shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Branch directory</h2>
          {branches.map((b) => (
            <div key={b.name} className="border-b border-border py-2.5 last:border-0"><p className="font-semibold">{b.name}</p><p className="text-xs text-muted-foreground">{b.address} · {b.phone}</p></div>
          ))}
        </Card>
      </div>
    </>
  );
}
