import type { ReactNode } from "react";
import { PublicLayout } from "@/components/site/PublicLayout";

export function PublicPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <PublicLayout>
      <section className="hero-navy text-navy-foreground">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-navy-foreground/75">{description}</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-6 py-16">{children}</div>
    </PublicLayout>
  );
}
