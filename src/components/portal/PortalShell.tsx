import { useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  LogOut,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { CommandPalette, useCommandPalette } from "@/components/portal/CommandPalette";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { NavGroup } from "@/config/navigation";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center border-b border-sidebar-border px-4">
        {collapsed ? (
          <Link to="/" className="mx-auto grid size-9 place-items-center rounded-xl bg-gold text-gold-foreground">
            <UserRound className="size-5" />
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
      </ScrollArea>
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
            <span className="truncate">Search…</span>
            <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold sm:block">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-0.5">
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

      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}
