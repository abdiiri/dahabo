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
      { title: "Our Services — Raw Material Supply & Transportation | Dahabo" },
      { name: "description", content: "Supplying raw materials like gypsum and cement, plus reliable transportation and logistics across Kenya and the region." },
      { property: "og:title", content: "Services | Dahabo Global Logistics" },
      { property: "og:description", content: "Raw material supply and transportation & logistics, delivered by one accountable team." },
    ],
  }),
  component: Services,
});

function Services() {
  return (
    <PublicPage
      eyebrow="Services"
      title="What we do"
      description="Two core services, delivered with the same reliability and accountability: sourcing the materials you need, and moving them where they need to go."
    >
      <div className="grid gap-6 md:grid-cols-2">
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
              ["What areas do you cover?", "We are based in Nairobi and serve customers across Kenya, with capacity for regional movements on request."],
              ["What raw materials do you supply?", "We currently supply gypsum and cement, in bulk or bagged quantities, sourced and delivered to your site."],
              ["Can you handle bulk cargo?", "Yes — our fleet includes heavy-duty trucks and trailers built for bulk and high-volume consignments."],
              ["How do I get a price?", "Share your material or transport requirement through the contact form or by phone, and we'll respond with a quote promptly."],
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
