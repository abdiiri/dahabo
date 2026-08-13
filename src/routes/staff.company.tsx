import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBranches, type Branch } from "@/lib/api/branches";

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

// No company_profile table exists in the database — these are placeholder
// defaults, not real records. Fill in and wire up a save action if/when
// this needs to be a real editable record.
const LEGAL_FIELDS: [string, string][] = [
  ["Legal name", "Dahabo Global Logistics Ltd"],
  ["Registration no.", "PVT-KE-2011-44821"],
  ["KRA PIN", "P051234567X"],
  ["VAT number", "0184472K"],
  ["Head office", "Enterprise Road, Nairobi"],
  ["Operations email", "ops@dahaboglobal.com"],
];

function Page() {
  const [branches, setBranches] = useState<Branch[] | null>(null);

  useEffect(() => {
    let active = true;
    listBranches().then((rows) => active && setBranches(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Company Profile"]} title="Company profile" description="Legal, tax and branch information." />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="grid gap-4 p-6 shadow-soft sm:grid-cols-2">
          {LEGAL_FIELDS.map(([l, v]) => (
            <div key={l} className="grid gap-2"><Label>{l}</Label><Input defaultValue={v} /></div>
          ))}
        </Card>
        <Card className="gap-2 p-6 shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Branch directory</h2>
          {branches === null ? (
            <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          ) : branches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No branches added yet.</p>
          ) : (
            branches.map((b) => (
              <div key={b.id} className="border-b border-border py-2.5 last:border-0">
                <p className="font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{[b.address, b.phone].filter(Boolean).join(" · ")}</p>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}
