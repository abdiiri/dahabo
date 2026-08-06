import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Filter, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: keyof T & string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = "Search records…",
  pageSize = 8,
  toolbar,
}: {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  pageSize?: number;
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const visibleColumns = columns.filter((c) => !hidden.includes(c.key));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? data.filter((row) =>
          Object.values(row).some((v) => String(v).toLowerCase().includes(q)),
        )
      : data;
    if (!sortKey) return base;
    return [...base].sort((a, b) => {
      const av = String(a[sortKey as keyof T] ?? "");
      const bv = String(b[sortKey as keyof T] ?? "");
      return sortAsc ? av.localeCompare(bv, undefined, { numeric: true }) : bv.localeCompare(av, undefined, { numeric: true });
    });
  }, [data, query, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <Card className="gap-0 overflow-hidden p-0 shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {selected.length > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toast.success(`${selected.length} record(s) queued for bulk action`)}
            >
              Bulk actions ({selected.length})
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => toast("Filters are demo-only")}>
            <Filter className="size-4" /> Filter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings2 className="size-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hidden.includes(c.key)}
                  onCheckedChange={(v) =>
                    setHidden((h) => (v ? h.filter((k) => k !== c.key) : [...h, c.key]))
                  }
                >
                  {c.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={() => toast.success("Export started (mock)")}>
            <Download className="size-4" /> Export
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="text-left">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) =>
                    setSelected(v ? Array.from(new Set([...selected, ...rows.map((r) => r.id)])) : [])
                  }
                  aria-label="Select all"
                />
              </th>
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground",
                    c.className,
                  )}
                >
                  <button
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                    onClick={() => {
                      setSortAsc(sortKey === c.key ? !sortAsc : true);
                      setSortKey(c.key);
                    }}
                  >
                    {c.header}
                    <ArrowUpDown className="size-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-border transition-colors hover:bg-secondary/60"
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selected.includes(row.id)}
                    onCheckedChange={(v) =>
                      setSelected((s) => (v ? [...s, row.id] : s.filter((id) => id !== row.id)))
                    }
                    aria-label={`Select ${row.id}`}
                  />
                </td>
                {visibleColumns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-4 py-14 text-center text-sm text-muted-foreground"
                >
                  No records match your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Showing {rows.length} of {filtered.length} records
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-semibold tabular-nums">
            Page {current + 1} / {pageCount}
          </span>
          <Button
            size="icon"
            variant="outline"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
