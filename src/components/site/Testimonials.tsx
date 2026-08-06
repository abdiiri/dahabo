import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { testimonials } from "@/data/site";
import { cn } from "@/lib/utils";

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = testimonials.length;

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(id);
  }, [paused, count]);

  const active = testimonials[index]!;
  const initials = active.name
    .split(" ")
    .map((p) => p[0])
    .join("");

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Card className="relative overflow-hidden p-8 shadow-lift sm:p-12">
        <Quote className="absolute -right-4 -top-4 size-32 text-gold/10" aria-hidden="true" />
        <div key={index} className="animate-fade-in">
          <div className="flex gap-1">
            {Array.from({ length: active.rating }).map((_, i) => (
              <Star key={i} className="size-5 fill-gold text-gold" />
            ))}
          </div>
          <blockquote className="mt-6 max-w-3xl text-xl font-medium leading-relaxed sm:text-2xl">
            “{active.quote}”
          </blockquote>
          <div className="mt-8 flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-navy font-display text-lg font-extrabold text-gold">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{active.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {active.position} · {active.company}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.name}
                type="button"
                aria-label={`Show testimonial from ${t.name}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-8 bg-gold" : "w-2 bg-border hover:bg-muted-foreground",
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous testimonial"
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next testimonial"
              onClick={() => setIndex((i) => (i + 1) % count)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
