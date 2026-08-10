import { createFileRoute } from "@tanstack/react-router";
import { Clock3, PhoneCall, ShieldCheck } from "lucide-react";
import { PublicPage } from "@/components/site/PublicPage";
import { QuoteForm } from "@/components/site/QuoteForm";
import { Reveal } from "@/components/site/Reveal";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "Request a Quote — Dahabo Global Logistics" },
      {
        name: "description",
        content:
          "Get a firm freight rate within two working hours. Share your cargo type, pickup and destination and our planners respond with pricing and a collection window.",
      },
      { property: "og:title", content: "Request a Freight Quote — Dahabo Global Logistics" },
      { property: "og:description", content: "Firm cargo transport pricing within two working hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuotePage,
});

function QuotePage() {
  return (
    <PublicPage
      eyebrow="Request Quote"
      title="Get pricing for your cargo"
      description="Complete the form below and our operations desk returns a firm rate, a vehicle recommendation and a collection window within two working hours."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <Reveal>
          <QuoteForm />
        </Reveal>
        <div className="space-y-4">
          {[
            [Clock3, "Two-hour response", "Quotes are returned within two working hours, 07:00 to 20:00."],
            [ShieldCheck, "Insured movements", "Goods-in-transit cover is included on every consignment."],
            [PhoneCall, "Prefer to talk?", "Call the operations desk on +254 722 665 333, any time."],
          ].map(([I, title, desc]) => {
            const Ico = I as typeof Clock3;
            return (
              <Reveal key={title as string}>
                <Card className="gap-2 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold">
                    <Ico className="size-5" />
                  </span>
                  <p className="mt-2 font-bold">{title as string}</p>
                  <p className="text-sm text-muted-foreground">{desc as string}</p>
                </Card>
              </Reveal>
            );
          })}
          <Card className="border-dashed p-5">
            <p className="text-sm font-semibold">Online payments</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Card and mobile money checkout for accepted quotes is coming soon.
            </p>
          </Card>
        </div>
      </div>
    </PublicPage>
  );
}
