import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import {
  listRecycleBin,
  restoreRecord,
  permanentlyDelete,
  resetAllOperationalData,
  type RecycleBinItem,
} from "@/lib/api/recycle-bin";

export const Route = createFileRoute("/staff/recycle-bin")({
  head: () => ({
    meta: [
      { title: "Recycle Bin | Dahabo Staff Portal" },
      { name: "description", content: "Restore anything deleted, or permanently remove it." },
    ],
  }),
  component: Page,
});

function Page() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [items, setItems] = useState<RecycleBinItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  function refresh() {
    listRecycleBin().then(setItems);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRestore(item: RecycleBinItem) {
    setBusyId(item.id);
    try {
      await restoreRecord(item.table, item.id);
      setItems((rows) => (rows ?? []).filter((r) => !(r.id === item.id && r.table === item.table)));
      toast.success(`${item.label} restored`);
    } catch (err) {
      toast.error("Couldn't restore this", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handlePermanentDelete(item: RecycleBinItem) {
    setBusyId(item.id);
    try {
      await permanentlyDelete(item.table, item.id);
      setItems((rows) => (rows ?? []).filter((r) => !(r.id === item.id && r.table === item.table)));
      toast.success("Permanently deleted");
    } catch (err) {
      toast.error("Couldn't delete this", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetAll() {
    setResetting(true);
    try {
      await resetAllOperationalData();
      toast.success("All operational data cleared", { description: "Everything moved here to the Recycle Bin — restore any of it any time." });
      setConfirmText("");
      refresh();
    } catch (err) {
      toast.error("Couldn't reset the system", { description: getErrorMessage(err) });
    } finally {
      setResetting(false);
    }
  }

  const columns: Column<RecycleBinItem>[] = [
    { key: "tableLabel", header: "Type" },
    { key: "label", header: "Record" },
    { key: "deletedAt", header: "Deleted", render: (r) => new Date(r.deletedAt).toLocaleString() },
    {
      key: "id",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={(e) => { e.stopPropagation(); handleRestore(r); }}>
            <RotateCcw className="size-3.5" /> Restore
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={busyId === r.id} className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="size-3.5" /> Delete forever
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete "{r.label}"?</AlertDialogTitle>
                <AlertDialogDescription>This can't be undone — it won't be recoverable after this.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handlePermanentDelete(r)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Recycle Bin"]}
        title="Recycle Bin"
        description="Anything deleted lands here first — restore it, or delete it permanently when you're sure."
      />

      {isAdmin ? (
        <Card className="mb-6 gap-3 border-destructive/30 bg-destructive/5 p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-destructive">
            <AlertTriangle className="size-4" /> Reset all data
          </h2>
          <p className="text-sm text-muted-foreground">
            For handing this system to a client with a clean slate. Moves every vehicle, driver, order, trip, and financial
            record to this Recycle Bin — staff/admin logins, branches, and audit history are untouched. Fully reversible
            from here afterward, so nothing is lost by mistake.
          </p>
          <AlertDialog onOpenChange={(open) => !open && setConfirmText("")}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-fit">
                <AlertTriangle className="size-4" /> Reset all data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>This clears the whole system</AlertDialogTitle>
                <AlertDialogDescription>
                  Every vehicle, driver, order, trip, fuel/maintenance record, and financial record moves to the Recycle
                  Bin. Type <span className="font-mono font-bold text-foreground">RESET</span> below to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-1.5 py-2">
                <Label className="text-sm">Type RESET to confirm</Label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirmText !== "RESET" || resetting}
                  onClick={handleResetAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {resetting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Reset all data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      ) : null}

      {items === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Trash2 className="size-8" />
          <p className="text-sm font-medium text-foreground">Recycle Bin is empty</p>
          <p className="max-w-sm text-xs">Anything deleted anywhere in the system will show up here.</p>
        </div>
      ) : (
        <DataTable data={items} columns={columns} searchPlaceholder="Search deleted records…" exportFilename="recycle-bin" />
      )}
    </>
  );
}
