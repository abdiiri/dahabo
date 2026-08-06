import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LifeBuoy, MessageSquare, PhoneCall } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/portal/support")({
  head: () => ({
    meta: [
      { title: "Support | Dahabo Customer Portal" },
      { name: "description", content: "Raise a support ticket or reach the 24/7 operations desk." },
      { property: "og:title", content: "Support | Dahabo Customer Portal" },
      { property: "og:description", content: "Raise a support ticket or reach the 24/7 operations desk." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader breadcrumb={["Portal", "Support"]} title="Support" description="We respond to portal tickets within one business hour." />
      <div className="grid gap-4 sm:grid-cols-3">
        {[[PhoneCall, "Operations desk", "+254 700 100 100"], [MessageSquare, "WhatsApp", "Coming soon"], [LifeBuoy, "Email", "support@dahaboglobal.com"]].map(([Icon, t, v], i) => {
          const I = Icon as typeof PhoneCall;
          return (
            <Card key={i} className="flex-row items-center gap-4 p-5 shadow-soft">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/18 text-gold"><I className="size-5" /></span>
              <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground">{t as string}</p><p className="font-semibold">{v as string}</p></div>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4 p-6 shadow-soft">
          <h2 className="text-lg font-bold">Raise a ticket</h2>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); toast.success("Ticket TCK-8841 created."); }}>
            <div className="grid gap-2"><Label htmlFor="s">Subject</Label><Input id="s" placeholder="Delay on DGL-102345" /></div>
            <div className="grid gap-2"><Label htmlFor="m">Details</Label><Textarea id="m" rows={5} /></div>
            <Button type="submit">Submit ticket</Button>
          </form>
        </Card>
        <Card className="gap-3 p-6 shadow-soft">
          <h2 className="text-lg font-bold">Common questions</h2>
          <Accordion type="single" collapsible>
            {[["How do I get proof of delivery?", "PODs are attached to each shipment record within two hours of delivery."], ["Can I change a delivery address?", "Yes, until the shipment leaves the origin hub. Raise a ticket and our desk will confirm."], ["How are invoices issued?", "Invoices are issued weekly per account, or per shipment on request."]].map(([q, a]) => (
              <AccordionItem key={q} value={String(q)}><AccordionTrigger className="text-left">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </>
  );
}
