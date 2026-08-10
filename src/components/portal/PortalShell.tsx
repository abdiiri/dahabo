import { useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  Clock,
  LogOut,
  Maximize2,
  MessageSquare,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Star,
  UserRound,
  PackagePlus,
  UserPlus,
  Truck,
  CalendarPlus,
  FileBarChart,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { CommandPalette, useCommandPalette } from "@/components/portal/CommandPalette";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notifications } from "@/data/mock";
import type { NavGroup } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Persona = { name: string; role: string; initials: string; email: string };

function SidebarNav({
  nav,
  collapsed,
  onNavigate,
}: {
  nav: NavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nav;
    return nav
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [nav, query]);

  const favourites = nav[0]?.items.slice(0, 2) ?? [];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center border-b border-sidebar-border px-4">
        {collapsed ? (
          <Link to="/" className="mx-auto grid size-9 place-items-center rounded-xl bg-gold text-gold-foreground">
            <Truck className="size-5" />
          </Link>
        ) : (
          <Logo variant="light" size="sm" />
        )}
      </div>

      {!collapsed ? (
        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu…"
              className="h-9 border-sidebar-border bg-sidebar-accent pl-9 text-sidebar-foreground placeholder:text-sidebar-foreground/50"
            />
          </div>
        </div>
      ) : null}

      <ScrollArea className="flex-1 px-2 pb-4">
        {!collapsed && favourites.length ? (
          <div className="mb-2 px-2">
            <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/50">
              <Star className="size-3 text-sidebar-primary" /> Favourites
            </p>
            {favourites.map((f) => (
              <Link
                key={`fav-${f.to}`}
                to={f.to}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <f.icon className="size-4" /> {f.label}
              </Link>
            ))}
          </div>
        ) : null}

        {filtered.map((group) => (
          <div key={group.group} className="mb-2">
            {!collapsed ? (
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/50">
                {group.group}
              </p>
            ) : (
              <Separator className="my-2 bg-sidebar-border" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to;
                const isOpen = openMenus.includes(item.label);
                return (
                  <li key={item.label}>
                    <div className="flex items-center">
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        title={item.label}
                        className={cn(
                          "group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft ring-1 ring-sidebar-border"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <item.icon
                          className={cn("size-4 shrink-0", active && "text-sidebar-primary")}
                        />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                        {!collapsed && item.badge ? (
                          <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold text-sidebar-primary-foreground">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                      {!collapsed && item.children ? (
                        <button
                          aria-label={`Toggle ${item.label} submenu`}
                          onClick={() =>
                            setOpenMenus((m) =>
                              m.includes(item.label)
                                ? m.filter((x) => x !== item.label)
                                : [...m, item.label],
                            )
                          }
                          className="rounded p-1 text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"
                        >
                          <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                        </button>
                      ) : null}
                    </div>
                    {!collapsed && item.children && isOpen ? (
                      <ul className="ml-6 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <Link
                              to={child.to}
                              onClick={onNavigate}
                              className="block rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {!collapsed ? (
          <div className="mt-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/50">
              <Clock className="size-3" /> Recent pages
            </p>
            <p className="mt-2 truncate text-xs text-sidebar-foreground/70">{pathname}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">/staff/shipments</p>
          </div>
        ) : null}
      </ScrollArea>
    </div>
  );
}

function NotificationBell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
          <Bell className="size-[18px]" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-bold">Notifications</p>
          <Badge variant="secondary">{notifications.length} new</Badge>
        </div>
        <Separator />
        <Tabs defaultValue="All">
          <TabsList className="m-2 grid w-[calc(100%-1rem)] grid-cols-5 text-[11px]">
            {["All", "Shipment", "Finance", "Drivers", "System"].map((t) => (
              <TabsTrigger key={t} value={t} className="text-[11px]">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
          {["All", "Shipment", "Finance", "Drivers", "System"].map((t) => (
            <TabsContent key={t} value={t} className="m-0">
              <ScrollArea className="h-72">
                {notifications
                  .filter((n) => t === "All" || n.category === t)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="flex gap-3 border-b border-border px-3 py-3 last:border-0 hover:bg-secondary/60"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          n.tone === "success"
                            ? "bg-success"
                            : n.tone === "warning"
                              ? "bg-warning"
                              : n.tone === "danger"
                                ? "bg-destructive"
                                : "bg-chart-4",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {n.category} · {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickActionsFab() {
  const actions = [
    { label: "Create Shipment", icon: PackagePlus },
    { label: "Create Customer", icon: UserPlus },
    { label: "Assign Driver", icon: Truck },
    { label: "Request Pickup", icon: CalendarPlus },
    { label: "Generate Report", icon: FileBarChart },
  ];
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" className="size-14 rounded-full bg-gold text-gold-foreground shadow-lift hover:bg-gold/90">
            <Plus className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((a) => (
            <DropdownMenuItem key={a.label} onSelect={() => toast.success(`${a.label} — demo action`)}>
              <a.icon className="size-4" /> {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PortalShell({
  nav,
  persona,
  children,
  onSignOut,
}: {
  nav: NavGroup[];
  persona: Persona;
  children: ReactNode;
  /** Called when the user chooses "Sign out". Falls back to the staff login link if omitted. */
  onSignOut?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { open, setOpen } = useCommandPalette();

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border transition-[width] duration-300 lg:block",
          collapsed ? "w-[74px]" : "w-[268px]",
        )}
      >
        <SidebarNav nav={nav} collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur sm:px-5">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <PanelLeftOpen className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarNav nav={nav} collapsed={false} />
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>

          <button
            onClick={() => setOpen(true)}
            className="group ml-1 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary md:max-w-md"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search everything…</span>
            <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold sm:block">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" aria-label="Messages">
              <MessageSquare className="size-[18px]" />
            </Button>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden rounded-full md:inline-flex" aria-label="Language">
                  <Globe className="size-[18px]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {["English", "Kiswahili", "Somali", "Français"].map((l) => (
                  <DropdownMenuItem key={l} onSelect={() => toast(`Language set to ${l} (demo)`)}>
                    {l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="hidden rounded-full md:inline-flex"
              aria-label="Fullscreen"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else document.documentElement.requestFullscreen?.();
              }}
            >
              <Maximize2 className="size-[18px]" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden rounded-full lg:inline-flex" aria-label="Settings" asChild>
              <Link to="/staff/settings">
                <Settings className="size-[18px]" />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 transition-colors hover:bg-secondary">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                      {persona.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left text-xs leading-tight sm:block">
                    <span className="block font-semibold">{persona.name}</span>
                    <span className="block text-muted-foreground">{persona.role}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold">{persona.name}</p>
                  <p className="text-xs text-muted-foreground">{persona.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/staff/settings">
                    <UserRound className="size-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/lock">
                    <Settings className="size-4" /> Lock screen
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onSignOut ? (
                  <DropdownMenuItem onSelect={onSignOut}>
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to="/staff-login">
                      <LogOut className="size-4" /> Sign out
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6">{children}</main>
      </div>

      <QuickActionsFab />
      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}
