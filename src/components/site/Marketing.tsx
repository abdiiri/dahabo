import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { futureFeatures, partners } from "@/data/site";

export function Partners() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {partners.map((p, i) => (
        <Reveal key={p} delay={i * 40}>
          <div className="card-lift grid h-24 place-items-center rounded-xl border border-border bg-card px-4 text-center">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {p}
            </span>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function FutureReady() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {futureFeatures.map((f, i) => (
        <Reveal key={f.title} delay={i * 50}>
          <Card className="h-full gap-2 border-dashed p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-surface text-gold">
                <Icon name={f.icon} className="size-5" />
              </span>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                Soon
              </Badge>
            </div>
            <p className="mt-2 font-semibold leading-snug">{f.title}</p>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}
