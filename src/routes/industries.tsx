import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PublicPage } from "@/components/site/PublicPage";
import { Reveal } from "@/components/site/Reveal";
import { Icon } from "@/components/site/Icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { industries } from "@/data/site";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries We Serve — Dahabo Global Logistics" },
      {
        name: "description",
        content:
          "Retail, manufacturing, construction, healthcare, agriculture, e-commerce, government, NGOs and more — logistics tailored to your sector across Kenya and East Africa.",
      },
      { property: "og:title", content: "Industries We Serve — Dahabo Global Logistics" },
      {
        property: "og:description",
        content: "Sector-specific cargo transport, distribution and warehousing across East Africa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndustriesPage,
});

const commitments = [
  "Named account manager and escalation path",
  "Sector-specific handling and packaging standards",
  "Contracted lane rates reviewed quarterly",
  "Monthly performance and exception reporting",
];

function IndustriesPage() {
  return (
    <PublicPage
      eyebrow="Industries"
      title="Logistics shaped around your sector"
      description="Every industry moves differently. We build the vehicle mix, timing and documentation around how your business actually operates."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((ind, i) => (
          <Reveal key={ind.name} delay={(i % 3) * 70}>
            <Card className="card-lift h-full gap-3 p-6">
              <span className="grid size-12 place-items-center rounded-2xl bg-navy text-gold">
                <Icon name={ind.icon} className="size-6" />
              </span>
              <h2 className="mt-2 text-lg font-bold">{ind.name}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{ind.desc}</p>
              <Link
                to="/quote"
                className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary hover:text-gold"
              >
                Request a quote <ArrowRight className="size-3.5" />
              </Link>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-16 block">
        <Card className="hero-navy grid gap-8 border-0 p-8 text-navy-foreground lg:grid-cols-[1.2fr_1fr] lg:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">Contract logistics</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold">What every sector contract includes</h2>
            <ul className="mt-6 space-y-3">
              {commitments.map((c) => (
                <li key={c} className="flex gap-3 text-navy-foreground/85">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-gold" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="self-center">
            <Button size="lg" className="w-full bg-gold text-gold-foreground hover:bg-gold/90" asChild>
              <Link to="/quote">Start a conversation</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="mt-3 w-full border-white/25 bg-white/5 text-navy-foreground hover:bg-white/15 hover:text-navy-foreground"
              asChild
            >
              <Link to="/services">See all services</Link>
            </Button>
          </div>
        </Card>
      </Reveal>
    </PublicPage>
  );
}
