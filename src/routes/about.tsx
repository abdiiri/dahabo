import { createFileRoute } from "@tanstack/react-router";
import { Award, Compass, HeartHandshake, Target } from "lucide-react";
import { PublicPage } from "@/components/site/PublicPage";
import { SectionHeading } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import aboutImg from "@/assets/about-excavator.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Dahabo Global Logistics Ltd" },
      { name: "description", content: "Our story, values and what drives our raw material supply and transportation business in Nairobi." },
      { property: "og:title", content: "About Dahabo Global Logistics Ltd" },
      { property: "og:description", content: "Supplying raw materials and moving cargo across Kenya, with reliability at the core." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PublicPage
      eyebrow="Who we are"
      title="Fourteen years of dependable freight across East Africa"
      description="Dahabo Global Logistics Ltd was founded in Nairobi in 2011 to give regional traders the visibility and reliability that global carriers reserve for multinationals."
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <img
          src={aboutImg}
          alt="Dahabo Global Logistics excavator on site"
          width={860}
          height={925}
          loading="lazy"
          className="rounded-2xl object-cover shadow-lift"
        />
        <div>
          <SectionHeading
            eyebrow="Our story"
            title="From four trucks to a regional network"
            description="From a single truck moving raw materials around Nairobi, we've grown into a dependable supplier and transporter serving builders, contractors and businesses across Kenya."
          />
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            We invest in operating discipline: reliable sourcing, well-maintained trucks and
            equipment, and a team that treats every delivery like it's the only one that matters.
            Our customers include contractors, construction firms and businesses that need raw
            materials and cargo moved without excuses.
          </p>
        </div>
      </div>

      <div className="mt-20 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Target, t: "Mission", d: "Supply the materials and move the cargo our customers need — safely, on time and without excuses." },
          { icon: Compass, t: "Vision", d: "To be the most trusted raw material and transport partner in Kenya." },
          { icon: HeartHandshake, t: "Values", d: "Integrity, accountability, safety and relentless service." },
          { icon: Award, t: "Reliability", d: "Well-maintained trucks and equipment, and a team that shows up on time." },
        ].map((v) => (
          <Card key={v.t} className="card-lift gap-2 p-6 shadow-soft">
            <span className="grid size-11 place-items-center rounded-xl bg-gold/18 text-gold">
              <v.icon className="size-5" />
            </span>
            <h3 className="mt-2 text-lg font-bold">{v.t}</h3>
            <p className="text-sm text-muted-foreground">{v.d}</p>
          </Card>
        ))}
      </div>

      <div className="mt-20">
        <SectionHeading eyebrow="Leadership" title="The team behind the network" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Amina Dahir", "Chief Executive Officer"],
            ["Peter Kimani", "Director of Operations"],
            ["Mercy Chebet", "Chief Financial Officer"],
            ["Yusuf Omar", "Head of Warehousing"],
          ].map(([name, role]) => (
            <Card key={name} className="items-center gap-1 p-6 text-center shadow-soft">
              <span className="grid size-16 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">
                {String(name).split(" ").map((n) => n[0]).join("")}
              </span>
              <p className="mt-3 font-bold">{name}</p>
              <p className="text-sm text-muted-foreground">{role}</p>
            </Card>
          ))}
        </div>
      </div>
    </PublicPage>
  );
}
