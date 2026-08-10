import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { PublicPage } from "@/components/site/PublicPage";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiveMap } from "@/components/common/LiveMap";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Dahabo Global Logistics" },
      { name: "description", content: "Reach us in Parklands, Nairobi — call, email, or send a message and our team will respond shortly." },
      { property: "og:title", content: "Contact Dahabo Global Logistics" },
      { property: "og:description", content: "Reach us in Parklands, Nairobi — call, email, or send a message and our team will respond shortly." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <PublicPage
      eyebrow="Contact"
      title="Get in touch"
      description="Have a question about supply or transport? Send us a message or reach out directly — we usually respond within one business day."
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
        <Card className="gap-5 p-7 shadow-soft">
          <h2 className="text-xl font-bold">Send us a message</h2>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); toast.success("Message sent — our team will respond shortly."); }}
          >
            <div className="grid gap-2"><Label htmlFor="fn">Full name</Label><Input id="fn" required placeholder="Jane Mwangi" /></div>
            <div className="grid gap-2"><Label htmlFor="em">Email</Label><Input id="em" type="email" required placeholder="jane@company.com" /></div>
            <div className="grid gap-2"><Label htmlFor="ph">Phone</Label><Input id="ph" placeholder="+254 700 000 000" /></div>
            <div className="grid gap-2">
              <Label>Topic</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger>
                <SelectContent>
                  {["New business", "Existing shipment", "Billing", "Careers", "Other"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2"><Label htmlFor="msg">Message</Label><Textarea id="msg" rows={5} placeholder="Tell us about your freight requirement…" /></div>
            <Button type="submit" className="sm:col-span-2">Send message</Button>
          </form>
        </Card>
        <div className="space-y-4">
          {[[Phone, "Call us", "+254 722 665 333"], [Mail, "Email", "abdirashiidmahad@gmail.com"], [MapPin, "Office location", "Parklands, Limuru Road, Amco Crystal Plaza, Suite 5A"]].map(([Icon, t, v], i) => {
            const I = Icon as typeof Phone;
            return (
              <Card key={i} className="flex-row items-center gap-4 p-5 shadow-soft">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/18 text-gold"><I className="size-5" /></span>
                <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground">{t as string}</p><p className="font-semibold">{v as string}</p></div>
              </Card>
            );
          })}
          <LiveMap compact />
        </div>
      </div>
    </PublicPage>
  );
}
