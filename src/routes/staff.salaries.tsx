import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AddSalaryDialog } from "@/components/staff/AddSalaryDialog";
import {
  listSalaries,
  markSalaryPaid,
  editSalary,
  deleteSalary,
  type EditSalaryInput,
} from "@/lib/api/salaries";
import {
  SALARY_TYPE_LABELS,
  DRIVER_PAYMENT_STATUS_LABELS,
  type Salary,
  type SalaryType,
} from "@/lib/api/types";

export const Route = createFileRoute("/staff/salaries")({
  head: () => ({
    meta: [
      { title: "Salaries & Payments | Dahabo Staff Portal" },
      {
        name: "description",
        content:
          "Optional salary, allowance and bonus payments to drivers, separate from mileage pay.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [entries, setEntries] = useState<Salary[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Salary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listSalaries().then((rows) => active && setEntries(rows));
    return () => {
      active = false;
    };
  }, []);

  async function markPaid(entry: Salary) {
    setBusyId(entry.id);
    try {
      await markSalaryPaid(entry.id);
      setEntries((rows) =>
        (rows ?? []).map((r) => (r.id === entry.id ? { ...r, status: "paid" } : r)),
      );
      toast.success("Marked paid");
    } catch (err) {
      toast.error("Couldn't update this payment", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setBusyId(deletingId);
    try {
      await deleteSalary(deletingId);
      setEntries((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success("Entry removed");
    } catch (err) {
      toast.error("Couldn't delete this entry", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<Salary>[] = [
    { key: "personName", header: "Driver", render: (r) => r.personName ?? "—" },
    { key: "type", header: "Type", render: (r) => SALARY_TYPE_LABELS[r.type] },
    {
      key: "periodMonth",
      header: "Date",
      render: (r) => new Date(r.periodMonth).toLocaleDateString(),
    },
    { key: "amount", header: "Amount", render: (r) => `KSh ${r.amount.toLocaleString()}` },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={DRIVER_PAYMENT_STATUS_LABELS[r.status]} />,
    },
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
            <DropdownMenuItem onSelect={() => setEditing(r)}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            {r.status !== "paid" ? (
              <DropdownMenuItem onSelect={() => markPaid(r)}>Mark paid</DropdownMenuItem>
            ) : null}
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
      <PageHeader
        breadcrumb={["Staff", "Salaries"]}
        title="Salaries & Payments"
        description="Optional — salary, allowance or bonus payments to drivers, separate from automatic mileage pay."
        actions={<AddSalaryDialog onCreated={(e) => setEntries((rows) => [e, ...(rows ?? [])])} />}
      />

      {entries === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={entries} columns={columns} searchPlaceholder="Search payments…" />
      )}

      <EditSalaryDialog
        entry={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setEntries((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
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

function EditSalaryDialog({
  entry,
  onClose,
  onSaved,
}: {
  entry: Salary | null;
  onClose: () => void;
  onSaved: (entry: Salary) => void;
}) {
  const [values, setValues] = useState<EditSalaryInput>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (entry) {
      setValues({
        type: entry.type,
        amount: entry.amount,
        periodMonth: entry.periodMonth,
        notes: entry.notes ?? "",
      });
    }
  }, [entry]);

  const set =
    <K extends keyof EditSalaryInput>(k: K) =>
    (v: EditSalaryInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!entry) return;
    if ((values.amount ?? 0) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editSalary(entry.id, values);
      toast.success("Payment updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
          <DialogDescription>The driver on this payment can't be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Type</Label>
              <Select
                value={values.type ?? "salary"}
                onValueChange={(v) => set("type")(v as SalaryType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SALARY_TYPE_LABELS) as SalaryType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {SALARY_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Amount (KSh)</Label>
              <Input
                type="number"
                min={0}
                value={values.amount ?? 0}
                onChange={(e) => set("amount")(Number(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm">Date</Label>
              <Input
                type="date"
                value={values.periodMonth ?? ""}
                onChange={(e) => set("periodMonth")(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Notes (optional)</Label>
            <Textarea
              value={values.notes ?? ""}
              onChange={(e) => set("notes")(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
