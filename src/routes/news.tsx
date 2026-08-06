import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/site/PublicPage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { newsPosts } from "@/data/mock";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Updates | Dahabo Global Logistics" },
      { name: "description", content: "Network expansions, fleet investment, compliance milestones and technology rollouts from Dahabo Global Logistics." },
      { property: "og:title", content: "Newsroom | Dahabo Global Logistics" },
      { property: "og:description", content: "The latest operational and network updates." },
    ],
  }),
  component: News,
});

function News() {
  const [lead, ...rest] = newsPosts;
  return (
    <PublicPage
      eyebrow="Newsroom"
      title="What's happening across the network"
      description="Operational milestones, fleet investment and corridor updates from across our six branches."
    >
      {lead ? (
        <Card className="hero-navy gap-3 border-0 p-10 text-navy-foreground shadow-lift">
          <Badge className="w-fit border-0 bg-white/10 text-gold">{lead.tag}</Badge>
          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold">{lead.title}</h2>
          <p className="max-w-2xl text-navy-foreground/75">{lead.excerpt}</p>
          <p className="mt-2 text-xs uppercase tracking-widest text-navy-foreground/50">{lead.date}</p>
        </Card>
      ) : null}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {rest.map((p) => (
          <Card key={p.slug} className="card-lift gap-2 p-6 shadow-soft">
            <Badge variant="secondary" className="w-fit">{p.tag}</Badge>
            <h3 className="mt-2 text-lg font-bold leading-snug">{p.title}</h3>
            <p className="text-sm text-muted-foreground">{p.excerpt}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{p.date}</p>
          </Card>
        ))}
      </div>
    </PublicPage>
  );
}
