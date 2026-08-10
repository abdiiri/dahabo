import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUp,
  Facebook,
  Globe,
  Linkedin,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Phone,
  Send,
  ShieldCheck,
  Twitter,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const links = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const languages = ["English", "Kiswahili", "Soomaali", "Français"];

function TopStrip() {
  return (
    <div className="hidden bg-navy text-navy-foreground lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-xs">
        <div className="flex items-center gap-5">
          <a href="tel:+254722665333" className="flex items-center gap-1.5 hover:text-gold">
            <Phone className="size-3.5 text-gold" /> +254 722 665 333
          </a>
          <a href="mailto:abdirashiidmahad@gmail.com" className="flex items-center gap-1.5 hover:text-gold">
            <Mail className="size-3.5 text-gold" /> abdirashiidmahad@gmail.com
          </a>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-gold" /> Parklands, Limuru Road, Nairobi
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-semibold uppercase tracking-widest text-gold">24/7 Operations Desk</span>
          <Link to="/staff-login" className="flex items-center gap-1.5 hover:text-gold">
            <ShieldCheck className="size-3.5" /> Admin & Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
}

function LanguageSwitch({ light }: { light?: boolean }) {
  const [lang, setLang] = useState("English");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Change language"
          className={cn("gap-1.5 rounded-full px-2.5", light && "text-navy-foreground hover:bg-white/10 hover:text-gold")}
        >
          <Globe className="size-[18px]" />
          <span className="hidden text-xs font-semibold uppercase tracking-wider sm:inline">
            {lang.slice(0, 2)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => setLang(l)}>
            {l}
            {l === lang ? <span className="ml-auto text-xs text-gold">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SiteHeader({ transparent }: { transparent?: boolean | undefined }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const floating = Boolean(transparent) && !scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        floating
          ? "border-transparent bg-transparent text-navy-foreground"
          : "border-border bg-background/90 shadow-soft backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-24 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo variant={floating ? "light" : "default"} size="lg" />
        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: floating ? "text-gold" : "bg-secondary text-foreground" }}
              className={cn(
                "rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
                floating
                  ? "text-navy-foreground/85 hover:text-gold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-1 lg:flex">
            <LanguageSwitch light={floating} />
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn("hidden lg:inline-flex", floating && "text-navy-foreground hover:bg-white/10 hover:text-gold")}
            asChild
          >
            <Link to="/staff-login">
              <LogIn className="size-4" /> Login
            </Link>
          </Button>
          <Button
            size="sm"
            className="hidden bg-gold text-gold-foreground hover:bg-gold/90 sm:inline-flex"
            asChild
          >
            <a href="tel:+254722665333">
              <Phone className="size-4" /> Call Now
            </a>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant={floating ? "ghost" : "outline"}
                size="icon"
                className={cn("lg:hidden", floating && "text-navy-foreground hover:bg-white/10")}
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] overflow-y-auto">
              <SheetTitle className="px-4 pt-4">Navigation</SheetTitle>
              <nav className="mt-4 flex flex-col gap-0.5 px-3">
                {links.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
                <Button variant="outline" asChild onClick={() => setOpen(false)}>
                  <Link to="/staff-login">Admin & Staff Login</Link>
                </Button>
                <Button className="bg-gold text-gold-foreground hover:bg-gold/90" asChild>
                  <a href="tel:+254722665333">Call Now</a>
                </Button>
                <div className="flex items-center justify-between pt-2">
                  <LanguageSwitch />
                  <ThemeToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  const [email, setEmail] = useState("");
  return (
    <footer className="mt-24 bg-navy text-navy-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo variant="light" size="lg" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-foreground/70">
              Dahabo Global Logistics Limited supplies raw materials — including gypsum and
              cement — and provides reliable transportation and logistics across Kenya.
            </p>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Newsletter</p>
              <form
                className="mt-3 flex max-w-sm gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Subscribed", { description: `We'll send updates to ${email || "your inbox"}.` });
                  setEmail("");
                }}
              >
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  aria-label="Email address for newsletter"
                  className="h-11 border-white/20 bg-white/10 text-navy-foreground placeholder:text-navy-foreground/50"
                />
                <Button type="submit" className="h-11 bg-gold text-gold-foreground hover:bg-gold/90">
                  <Send className="size-4" />
                  <span className="sr-only">Subscribe</span>
                </Button>
              </form>
            </div>
            <div className="mt-6 flex gap-2">
              {[Linkedin, Twitter, Facebook].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social media"
                  className="grid size-9 place-items-center rounded-lg bg-white/10 transition-colors hover:bg-gold hover:text-gold-foreground"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
          {[
            {
              title: "Company",
              items: [
                ["About Us", "/about"],
                ["Services", "/services"],
                ["Fleet", "/fleet"],
                ["Branches", "/branches"],
                ["Industries", "/industries"],
                ["Careers", "/careers"],
              ],
            },
            {
              title: "Quick Links",
              items: [
                ["Track Shipment", "/track"],
                ["Request Quote", "/quote"],
                ["News & Updates", "/news"],
                ["Contact Us", "/contact"],
                ["Admin & Staff Portal", "/staff-login"],
              ],
            },
            {
              title: "Support",
              items: [
                ["Privacy Policy", "/about"],
                ["Terms & Conditions", "/about"],
                ["Help Centre", "/contact"],
                ["Claims & Insurance", "/contact"],
                ["Service Status", "/maintenance"],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.items.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to as string} className="text-navy-foreground/75 transition-colors hover:text-gold">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 rounded-2xl bg-white/5 p-6 sm:grid-cols-3">
          <a href="tel:+254722665333" className="flex gap-3 text-sm hover:text-gold">
            <Phone className="mt-0.5 size-4 shrink-0 text-gold" /> +254 722 665 333 · 24/7 desk
          </a>
          <a href="mailto:abdirashiidmahad@gmail.com" className="flex gap-3 text-sm hover:text-gold">
            <Mail className="mt-0.5 size-4 shrink-0 text-gold" /> abdirashiidmahad@gmail.com
          </a>
          <span className="flex gap-3 text-sm text-navy-foreground/75">
            <MapPin className="mt-0.5 size-4 shrink-0 text-gold" /> Parklands, Limuru Road, Amco Crystal Plaza, Suite 5A, Nairobi
          </span>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-navy-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Dahabo Global Logistics Limited. Delivering beyond borders.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="self-start text-navy-foreground hover:bg-white/10 hover:text-gold"
          >
            Back to top <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
}

function FloatingActions() {
  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => toast("Live chat coming soon", { description: "WhatsApp and AI assistant support is on the roadmap." })}
        className="grid size-12 place-items-center rounded-full bg-gold text-gold-foreground shadow-lift transition-transform hover:scale-105"
        aria-label="Chat with us (coming soon)"
      >
        <ArrowRight className="size-5 -rotate-45" />
      </button>
    </div>
  );
}

export function PublicLayout({
  children,
  transparentHeader,
}: {
  children: ReactNode;
  transparentHeader?: boolean | undefined;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background scroll-smooth">
      <TopStrip />
      <SiteHeader transparent={transparentHeader} />
      <main className={cn("flex-1", transparentHeader && "-mt-[76px]")}>{children}</main>
      <SiteFooter />
      <FloatingActions />
    </div>
  );
}
