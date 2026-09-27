import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Pencil, Trash2, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddPartnerDialog } from "@/components/staff/AddPartnerDialog";
import { listPartners, editPartner, deletePartner, type EditPartnerInput } from "@/lib/api/partners";
import type { Partner } from "@/lib/api/types";
import { usePermissions } from "@/lib/permissions";
import { useRefetchOnFocus } from "@/lib/use-refetch-on-focus";

export const Route = createFileRoute("/staff/partner-fleet")({
  head: () => ({
    meta: [
      { title: "Partner Fleet | Dahabo Staff Portal" },
      {
        name: "description",
        content: "Owner-operators with their own vehicle and driver, given jobs directly.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canCreate = can("partners", "create");
  const canEdit = can("partners", "edit");
  const canDelete = can("partners", "delete");
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    listPartners().then(setPartners);
  }

  useEffect(() => {
    let active = true;
    listPartners().then((rows) => active && setPartners(rows));
    return () => {
      active = false;
    };
  }, []);

  useRefetchOnFocus(refresh);

  async function handleDelete() {
    if (!deletingId) return;
    if (!canDelete) {
      toast.error("You don't have permission to delete partners");
      setDeletingId(null);
      return;
    }
    const partner = (partners ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deletePartner(deletingId);
      setPartners((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`${partner?.name ?? "Partner"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this partner", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<Partner>[] = [
    { key: "partnerCode", header: "ID" },
    { key: "name", header: "Partner" },
    { key: "vehiclePlate", header: "Vehicle" },
    { key: "driverName", header: "Driver" },
    { key: "phone", header: "Phone", render: (r) => r.phone ?? "—" },
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
            {canEdit ? (
              <DropdownMenuItem onSelect={() => setEditing(r)}>
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() => navigate({ to: "/staff/partner-payments", search: { partner: r.id } })}
            >
              <Wallet className="size-4" /> View jobs & payments
            </DropdownMenuItem>
            {canDelete ? (
              <DropdownMenuItem
                onSelect={() => setDeletingId(r.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Partner Fleet"]}
        title="Partner Fleet"
        description="Owner-operators who bring their own vehicle and driver — you hand them a job and keep a margin, instead of running it through your own fleet."
        actions={
          canCreate ? <AddPartnerDialog onCreated={(p) => setPartners((rows) => [p, ...(rows ?? [])])} /> : null
        }
      />

      {partners === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : partners.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Truck className="size-8" />
          <p className="text-sm font-medium text-foreground">No partners yet</p>
          <p className="max-w-sm text-xs">
            Owner-operators you add here can be picked instead of your own fleet when starting a
            trip.
          </p>
        </div>
      ) : (
        <DataTable data={partners} columns={columns} exportFilename="partner-fleet" />
      )}

      <EditPartnerDialog
        partner={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setPartners((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this partner?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves them to the Recycle Bin, where they can be restored later or permanently
              deleted. Jobs already recorded against them are untouched.
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

function EditPartnerDialog({
  partner,
  onClose,
  onSaved,
}: {
  partner: Partner | null;
  onClose: () => void;
  onSaved: (partner: Partner) => void;
}) {
  const [values, setValues] = useState<EditPartnerInput>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (partner) {
      setValues({
        name: partner.name,
        phone: partner.phone ?? "",
        vehiclePlate: partner.vehiclePlate,
        driverName: partner.driverName,
      });
    }
  }, [partner]);

  const set =
    <K extends keyof EditPartnerInput>(k: K) =>
    (v: EditPartnerInput[K]) =>
      setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!partner) return;
    if (!values.name?.trim() || !values.vehiclePlate?.trim() || !values.driverName?.trim()) {
      toast.error("Partner name, vehicle plate, and driver name are required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editPartner(partner.id, values);
      toast.success("Partner updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={partner !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit partner</DialogTitle>
          <DialogDescription>Partner ID can't be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Partner name</Label>
            <Input value={values.name ?? ""} onChange={(e) => set("name")(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Vehicle plate</Label>
              <Input
                value={values.vehiclePlate ?? ""}
                onChange={(e) => set("vehiclePlate")(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Driver name</Label>
              <Input
                value={values.driverName ?? ""}
                onChange={(e) => set("driverName")(e.target.value)}
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
