import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listWarehouses, deleteWarehouse, type Warehouse } from "@/lib/api/warehouses";

export const Route = createFileRoute("/staff/warehouses")({
  head: () => ({
    meta: [
      { title: "Warehouses | Dahabo Staff Portal" },
      { name: "description", content: "Storage facilities, dock counts, managers and live capacity utilisation." },
      { property: "og:title", content: "Warehouses | Dahabo Staff Portal" },
      { property: "og:description", content: "Storage facilities, dock counts, managers and live capacity utilisation." },
    ],
  }),
  component: Page,
});

function Page() {
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listWarehouses().then((rows) => active && setWarehouses(rows));
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete() {
    if (!deletingId) return;
    const warehouse = (warehouses ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deleteWarehouse(deletingId);
      setWarehouses((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`${warehouse?.name ?? "Warehouse"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this warehouse", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<Warehouse>[] = [
    { key: "warehouseCode", header: "ID" },
    { key: "name", header: "Facility" },
    { key: "city", header: "City", render: (r) => r.city ?? "—" },
    { key: "sizeSqm", header: "Area (sqm)", render: (r) => r.sizeSqm ?? "—" },
    { key: "dockCount", header: "Docks", render: (r) => r.dockCount ?? "—" },
    { key: "managerName", header: "Manager", render: (r) => r.managerName ?? "—" },
    { key: "capacityPct", header: "Capacity", render: (r) => (r.capacityPct != null ? `${r.capacityPct}%` : "—") },
    {
      key: "id",
      header: "",
      className: "w-10",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={busyId === r.id}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onSelect={() => setDeletingId(r.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Warehouses"]} title="Warehouses" description="Facilities, docks and live capacity." />

      {warehouses === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={warehouses} columns={columns} searchPlaceholder="Search warehouses…" />
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this warehouse?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves it to the Recycle Bin, where it can be restored later or permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
