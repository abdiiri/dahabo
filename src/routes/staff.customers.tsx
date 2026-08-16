import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AddCustomerDialog } from "@/components/staff/AddCustomerDialog";
import {
  listCustomers,
  editCustomer,
  deleteCustomer,
  type EditCustomerInput,
} from "@/lib/api/customers";
import type { Customer } from "@/lib/api/types";

export const Route = createFileRoute("/staff/customers")({
  head: () => ({
    meta: [
      { title: "Customers | Dahabo Staff Portal" },
      {
        name: "description",
        content: "Manage customer accounts, contacts, and billing status across the network.",
      },
      { property: "og:title", content: "Customers | Dahabo Staff Portal" },
      {
        property: "og:description",
        content: "Manage customer accounts, contacts, and billing status across the network.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listCustomers().then((rows) => active && setCustomers(rows));
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete() {
    if (!deletingId) return;
    const customer = (customers ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deleteCustomer(deletingId);
      setCustomers((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`${customer?.name ?? "Customer"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this customer", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<Customer>[] = [
    { key: "customerCode", header: "ID" },
    { key: "name", header: "Customer" },
    { key: "contact", header: "Contact" },
    { key: "email", header: "Email" },
    { key: "tier", header: "Tier" },
    {
      key: "outstanding",
      header: "Outstanding",
      render: (r) => `KES ${r.outstanding.toLocaleString()}`,
    },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
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
        breadcrumb={["Staff", "Customers"]}
        title="Customers"
        description="Accounts and billing contacts."
        actions={
          <AddCustomerDialog onCreated={(c) => setCustomers((rows) => [c, ...(rows ?? [])])} />
        }
      />

      {customers === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Users className="size-8" />
          <p className="text-sm font-medium text-foreground">No customers yet</p>
          <p className="max-w-sm text-xs">Customers you add will show up here.</p>
        </div>
      ) : (
        <DataTable data={customers} columns={columns} />
      )}

      <EditCustomerDialog
        customer={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setCustomers((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves them to the Recycle Bin, where they can be restored later or permanently
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

function EditCustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}) {
  const [values, setValues] = useState<EditCustomerInput>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setValues({
        name: customer.name,
        contact: customer.contact ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        tier: customer.tier,
      });
    }
  }, [customer]);

  const set =
    <K extends keyof EditCustomerInput>(k: K) =>
    (v: EditCustomerInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!customer) return;
    if (!values.name?.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editCustomer(customer.id, values);
      toast.success("Customer updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={customer !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
          <DialogDescription>Customer ID can't be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Customer / company name</Label>
            <Input value={values.name ?? ""} onChange={(e) => set("name")(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Contact person</Label>
              <Input
                value={values.contact ?? ""}
                onChange={(e) => set("contact")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Tier</Label>
              <Select value={values.tier ?? "SME"} onValueChange={set("tier")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="SME">SME</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Email</Label>
              <Input
                type="email"
                value={values.email ?? ""}
                onChange={(e) => set("email")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Phone</Label>
              <Input value={values.phone ?? ""} onChange={(e) => set("phone")(e.target.value)} />
            </div>
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
