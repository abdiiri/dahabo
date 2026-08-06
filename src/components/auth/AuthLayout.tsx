import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Card } from "@/components/ui/card";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-navy relative hidden flex-col justify-between p-12 text-navy-foreground lg:flex">
        <Logo variant="light" />
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight">
            One platform for freight, fleet, warehousing and finance.
          </h2>
          <p className="mt-4 max-w-md text-navy-foreground/70">
            Secure access to the Dahabo Global Logistics operations network.
          </p>
        </div>
        <p className="text-xs text-navy-foreground/50">© 2026 Dahabo Global Logistics Ltd</p>
      </div>
      <div className="flex flex-col bg-background">
        <div className="flex items-center justify-between p-5">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to website</Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-md gap-5 p-8 shadow-lift">
            <div className="lg:hidden"><Logo /></div>
            <div>
              <h1 className="text-2xl font-extrabold">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            {footer ? <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
