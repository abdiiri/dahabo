import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/portal/profile")({
  head: () => ({
    meta: [
      { title: "My Profile | Dahabo Customer Portal" },
      { name: "description", content: "Manage your contact details, company information and account security." },
      { property: "og:title", content: "My Profile | Dahabo Customer Portal" },
      { property: "og:description", content: "Manage your contact details, company information and account security." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Portal", "Profile"]} title="My profile" description="Contact details and company information." actions={<Button>Save changes</Button>} />
      <div className="grid gap-6 lg:grid-cols-[0.6fr_1fr]">
        <Card className="items-center gap-2 p-8 text-center shadow-soft">
          <Avatar className="size-20"><AvatarFallback className="bg-primary text-xl font-extrabold text-primary-foreground">JM</AvatarFallback></Avatar>
          <p className="mt-3 text-lg font-bold">Jane Mwangi</p>
          <p className="text-sm text-muted-foreground">Logistics Manager · Sahal Trading Co.</p>
          <Button variant="outline" className="mt-3">Upload photo</Button>
        </Card>
        <Card className="grid gap-4 p-6 shadow-soft sm:grid-cols-2">
          {[["Full name", "Jane Mwangi"], ["Email", "ops@sahaltrading.com"], ["Phone", "+254 700 445 112"], ["Company", "Sahal Trading Co."], ["Account tier", "Enterprise"], ["Billing address", "Enterprise Road, Nairobi"]].map(([l, v]) => (
            <div key={l} className="grid gap-2"><Label>{l}</Label><Input defaultValue={v} /></div>
          ))}
        </Card>
      </div>
    </>
  );
}
