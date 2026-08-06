import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PublicPage } from "@/components/site/PublicPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { serviceList } from "@/data/mock";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Logistics Services — Road, Air, Sea, Warehousing | Dahabo" },
      { name: "description", content: "Road freight, air freight, sea freight, warehousing, cold chain, customs clearing, project cargo and last-mile distribution." },
      { property: "og:title", content: "Logistics Services | Dahabo Global Logistics" },
      { property: "og:description", content: "Eight integrated service lines managed from one control tower." },
    ],
  }),
  component: Services,
});

function Services() {
  return (
    <PublicPage
      eyebrow="Services"
      title="Eight service lines, one accountable partner"
      description="Every service is delivered on the same operating platform, so reporting, tracking and billing stay consistent no matter how your cargo moves."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {serviceList.map((s) => (
          <Card key={s.key} className="card-lift gap-3 p-7 shadow-soft">
            <h2 className="text-xl font-bold">{s.name}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            <ul className="mt-2 space-y-2">
              {s.points.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <span className="grid size-5 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="size-3" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <h2 className="text-2xl font-extrabold">Frequently asked</h2>
          <Accordion type="single" collapsible className="mt-6">
            {[
              ["What regions do you cover?", "Kenya, Uganda, Tanzania, Ethiopia, South Sudan, Somalia and Djibouti, with partner coverage into Rwanda and DRC."],
              ["Do you handle customs clearing?", "Yes — we are a licensed clearing and forwarding agent and can pre-lodge declarations before cargo arrives."],
              ["Is my cargo insured?", "All movements carry goods-in-transit cover up to USD 2M per consignment, with higher limits available on request."],
              ["Can I integrate with your systems?", "Integration slots for tracking, messaging and payments are already provisioned on the platform."],
            ].map(([q, a]) => (
              <AccordionItem key={q} value={String(q)}>
                <AccordionTrigger className="text-left">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <Card className="hero-navy h-fit gap-3 border-0 p-8 text-navy-foreground shadow-lift">
          <h3 className="text-xl font-bold">Need a tailored solution?</h3>
          <p className="text-sm text-navy-foreground/75">
            Share your lanes and volumes and our commercial desk will build a costed plan within 24
            hours.
          </p>
          <Button className="mt-3 w-fit bg-gold text-gold-foreground hover:bg-gold/90" asChild>
            <Link to="/quote">Request a quote</Link>
          </Button>
        </Card>
      </div>
    </PublicPage>
  );
}
