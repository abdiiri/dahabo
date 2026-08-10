import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PhoneCall, Play, ShieldCheck, Star } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SectionHeading } from "@/components/common/PageHeader";
import { Reveal, Counter } from "@/components/site/Reveal";
import { Icon } from "@/components/site/Icon";
import { TrackingWidget } from "@/components/site/TrackingWidget";
import { CoverageMap } from "@/components/site/CoverageMap";
import { Testimonials } from "@/components/site/Testimonials";
import { Partners, FutureReady } from "@/components/site/Marketing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  companyStats,
  faqs,
  fleetTypes,
  heroStats,
  industries,
  newsArticles,
  publicServices,
  whyChooseUs,
} from "@/data/site";
import heroImage from "@/assets/hero-highway.jpg";
import vehicleHeavy from "@/assets/vehicle-heavy-truck.jpg";
import vehicleBox from "@/assets/vehicle-box-truck.jpg";
import vehicleVan from "@/assets/vehicle-van.jpg";
import containerYard from "@/assets/container-yard.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dahabo Global Logistics — Raw Material Supply & Transportation, Nairobi" },
      {
        name: "description",
        content:
          "Supplying raw materials like gypsum and cement, plus reliable transportation and logistics across Kenya. Based in Parklands, Nairobi.",
      },
      { property: "og:title", content: "Dahabo Global Logistics Limited — Delivering Beyond Borders" },
      {
        property: "og:description",
        content:
          "Raw material supply and transportation & logistics, delivered by one accountable team based in Nairobi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const fleetImages: Record<string, string> = {
  heavy: vehicleHeavy,
  box: vehicleBox,
  van: vehicleVan,
  pickup: vehicleBox,
  moto: vehicleVan,
  special: containerYard,
};

function Home() {
  const featured = newsArticles[0]!;

  return (
    <PublicLayout transparentHeader>
      {/* Hero */}
      <section className="relative isolate flex min-h-screen items-center overflow-hidden text-navy-foreground">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={heroImage}
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover"
        >
          <source src="/video/hero-truck.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,oklch(0.18_0.05_262/0.94)_0%,oklch(0.2_0.06_262/0.82)_45%,oklch(0.2_0.06_262/0.45)_100%)]"
          aria-hidden="true"
        />
        <div className="mx-auto w-full max-w-7xl px-6 pb-16 pt-32 lg:pb-24 lg:pt-40">
          <div className="max-w-3xl">
            <Reveal>
              <Badge className="border-0 bg-white/10 px-3 py-1.5 text-gold backdrop-blur">
                <ShieldCheck className="size-3.5" /> Licensed · Insured · 24/7 operations desk
              </Badge>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.06] sm:text-6xl lg:text-[4.2rem]">
                Delivering Your Cargo With
                <span className="text-gold"> Speed, Security</span> & Reliability
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy-foreground/85">
                Dahabo Global Logistics Limited supplies quality raw materials — including
                gypsum and cement — and provides reliable transportation and logistics across
                Kenya, from our base in Nairobi.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button size="lg" className="h-13 bg-gold px-7 text-base text-gold-foreground hover:bg-gold/90" asChild>
                  <Link to="/track">
                    Track Shipment <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 border-white/30 bg-white/5 px-7 text-base text-navy-foreground backdrop-blur hover:bg-white/15 hover:text-navy-foreground"
                  asChild
                >
                  <Link to="/quote">Request Quote</Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-13 px-4 text-base text-navy-foreground hover:bg-white/10 hover:text-gold"
                  asChild
                >
                  <a href="tel:+254722665333">
                    <PhoneCall className="size-4" /> +254 722 665 333
                  </a>
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Floating stats */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
            {heroStats.map((s, i) => (
              <Reveal key={s.label} delay={300 + i * 90}>
                <div className="card-lift rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <p className="font-display text-3xl font-extrabold text-gold sm:text-4xl">
                    <Counter value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-1.5 text-xs uppercase tracking-[0.18em] text-navy-foreground/70">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal>
          <SectionHeading
            eyebrow="What we do"
            title="Two services, one dependable partner"
            description="From sourcing raw materials to moving them where they're needed, every job is planned and delivered by the same accountable team."
            align="center"
          />
        </Reveal>
        <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
          {publicServices.map((s, i) => (
            <Reveal key={s.slug} delay={i * 90}>
              <Card className="card-lift group h-full gap-4 overflow-hidden p-8 shadow-soft">
                <span className="grid size-14 place-items-center rounded-2xl bg-navy text-gold transition-colors group-hover:bg-gold group-hover:text-gold-foreground">
                  <Icon name={s.icon} className="size-7" />
                </span>
                <h3 className="mt-2 text-xl font-bold">{s.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                <Link
                  to="/services"
                  className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary transition-colors hover:text-gold"
                >
                  Learn More <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-surface py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Why Dahabo"
              title="The reasons customers stay with us"
              description="Performance you can audit, people you can reach and equipment you can rely on."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {whyChooseUs.map((w, i) => (
              <Reveal key={w.title} delay={(i % 5) * 70}>
                <Card className="card-lift h-full gap-2 p-5">
                  <span className="grid size-11 place-items-center rounded-xl bg-gold/15 text-gold">
                    <Icon name={w.icon} className="size-5" />
                  </span>
                  <p className="mt-2 font-bold">{w.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{w.desc}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Live tracker */}
      <section id="tracker" className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Live tracking"
            title="Where is my shipment right now?"
            description="Every Dahabo consignment moves through seven verified milestones. Search and see exactly where yours is."
            align="center"
          />
        </Reveal>
        <Reveal delay={100} className="mt-12 block">
          <TrackingWidget />
        </Reveal>
      </section>

      {/* Quote CTA band */}
      <section className="hero-navy py-20 text-navy-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 lg:grid-cols-[1.3fr_auto]">
          <Reveal>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">Get pricing</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
                Tell us what you're moving. We'll quote within two hours.
              </h2>
              <p className="mt-4 max-w-2xl text-navy-foreground/80">
                Share pickup and destination, cargo type and weight — our planners return a firm rate,
                a vehicle recommendation and a collection window.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-13 bg-gold px-7 text-gold-foreground hover:bg-gold/90" asChild>
                <Link to="/quote">Request Quote</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 border-white/30 bg-white/5 px-7 text-navy-foreground hover:bg-white/15 hover:text-navy-foreground"
                asChild
              >
                <Link to="/contact">Talk to a planner</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Fleet */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal>
            <SectionHeading
              eyebrow="Our fleet"
              title="The right vehicle for every load"
              description="150+ owned and contracted vehicles, serviced on a strict interval plan and fitted with telematics."
            />
          </Reveal>
          <Reveal delay={80}>
            <Button variant="outline" asChild>
              <Link to="/fleet">View full fleet</Link>
            </Button>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fleetTypes.map((f, i) => (
            <Reveal key={f.name} delay={(i % 3) * 80}>
              <Card className="card-lift h-full overflow-hidden p-0">
                <div className="relative aspect-16/10 overflow-hidden bg-surface">
                  <img
                    src={fleetImages[f.image] ?? vehicleHeavy}
                    alt={f.name}
                    loading="lazy"
                    width={900}
                    height={640}
                    className="size-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <Badge
                    className={
                      f.available === "Available"
                        ? "absolute left-3 top-3 border-0 bg-success text-success-foreground"
                        : "absolute left-3 top-3 border-0 bg-warning text-warning-foreground"
                    }
                  >
                    {f.available}
                  </Badge>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold">{f.name}</h3>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">{f.units} units</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gold">{f.capacity}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                  <Link
                    to="/fleet"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-gold"
                  >
                    Learn More <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section className="bg-surface py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Industries"
              title="Sectors we move cargo for"
              description="From retail replenishment to relief distribution, our planners understand the operating rhythm of your sector."
              align="center"
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((ind, i) => (
              <Reveal key={ind.name} delay={(i % 4) * 60}>
                <Link to="/industries" className="block h-full">
                  <Card className="card-lift h-full flex-row items-start gap-4 p-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-gold">
                      <Icon name={ind.icon} className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold">{ind.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{ind.desc}</p>
                    </div>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage map */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Network"
            title="Branches, routes and warehouses"
            description="Six branches, five major corridors and nationwide partner coverage across all 47 counties."
          />
        </Reveal>
        <Reveal delay={100} className="mt-12 block">
          <CoverageMap />
        </Reveal>
      </section>

      {/* Company statistics */}
      <section className="hero-navy py-20 text-navy-foreground">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">By the numbers</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              A track record measured, not claimed
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {companyStats.map((s, i) => (
              <Reveal key={s.label} delay={(i % 4) * 80}>
                <div className="rounded-2xl border border-white/12 bg-white/5 p-6">
                  <p className="font-display text-4xl font-extrabold text-gold">
                    <Counter value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-navy-foreground/70">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Customer voices"
            title="Trusted by operators who cannot afford delays"
            align="center"
          />
        </Reveal>
        <Reveal delay={100} className="mt-12 block">
          <Testimonials />
        </Reveal>
      </section>

      {/* Partners */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <SectionHeading eyebrow="Partners" title="Companies that move with Dahabo" align="center" />
          </Reveal>
          <div className="mt-12">
            <Partners />
          </div>
        </div>
      </section>

      {/* News */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal>
            <SectionHeading eyebrow="Newsroom" title="News & updates" className="max-w-xl" />
          </Reveal>
          <Reveal delay={80}>
            <Button variant="outline" asChild>
              <Link to="/news">All articles</Link>
            </Button>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <Card className="card-lift h-full overflow-hidden p-0">
              <div className="relative aspect-16/9 overflow-hidden">
                <img
                  src={containerYard}
                  alt={featured.title}
                  loading="lazy"
                  width={1280}
                  height={860}
                  className="size-full object-cover"
                />
                <Badge className="absolute left-4 top-4 border-0 bg-gold text-gold-foreground">Featured</Badge>
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {featured.category} · {featured.date}
                </p>
                <h3 className="mt-2 text-2xl font-extrabold">{featured.title}</h3>
                <p className="mt-3 text-muted-foreground">{featured.excerpt}</p>
                <Link to="/news" className="mt-4 inline-flex items-center gap-1.5 font-semibold text-primary hover:text-gold">
                  Read More <ArrowRight className="size-4" />
                </Link>
              </div>
            </Card>
          </Reveal>
          <div className="space-y-4">
            {newsArticles.slice(1, 5).map((n, i) => (
              <Reveal key={n.slug} delay={i * 70}>
                <Card className="card-lift gap-1 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                    {n.category} · {n.date}
                  </p>
                  <p className="mt-1 font-bold leading-snug">{n.title}</p>
                  <Link to="/news" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-gold">
                    Read More <ArrowRight className="size-3.5" />
                  </Link>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <SectionHeading
                eyebrow="FAQ"
                title="Answers before you book"
                description="Shipping, tracking, pricing, pickups, insurance and payments — the questions we hear most."
              />
              <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="size-4 fill-gold text-gold" /> 4.9 average customer rating across 400+ reviews
              </div>
              <Button className="mt-6 bg-gold text-gold-foreground hover:bg-gold/90" asChild>
                <Link to="/contact">
                  <Play className="size-4" /> Talk to support
                </Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={f.q} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-base font-semibold">
                    <span>
                      <span className="mr-2 text-xs font-bold uppercase tracking-wider text-gold">{f.cat}</span>
                      {f.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* Future ready */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Roadmap"
            title="Built to grow with your operation"
            description="These capabilities are designed into the platform and will switch on as each integration completes."
            align="center"
          />
        </Reveal>
        <div className="mt-14">
          <FutureReady />
        </div>
      </section>
    </PublicLayout>
  );
}
