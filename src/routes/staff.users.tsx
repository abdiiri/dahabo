import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Lock, MoreHorizontal, Pencil, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AddStaffDialog } from "@/components/staff/AddStaffDialog";
import { listStaff, editStaff, deleteStaff, setStaffAccountStatus, type EditStaffInput } from "@/lib/api/staff";
import { STAFF_ROLE_LABELS, type StaffMember, type StaffRole } from "@/lib/api/types";

export const Route = createFileRoute("/staff/users")({
  head: () => ({
    meta: [
      { title: "Staff | Dahabo Staff Portal" },
      { name: "description", content: "Staff accounts, roles and account status." },
      { property: "og:title", content: "Staff | Dahabo Staff Portal" },
      { property: "og:description", content: "Staff accounts, roles and account status." },
    ],
  }),
  component: Page,
});

const ASSIGNABLE_ROLES: StaffRole[] = [
  "admin",
  "operations_manager",
  "finance_officer",
  "warehouse_manager",
  "fleet_manager",
  "staff",
];

function Page() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listStaff().then((rows) => active && setStaff(rows));
    return () => {
      active = false;
    };
  }, []);

  async function toggleStatus(member: StaffMember) {
    const activate = member.status === "suspended";
    setBusyId(member.id);
    try {
      await setStaffAccountStatus(member.id, activate);
      setStaff((rows) => (rows ?? []).map((r) => (r.id === member.id ? { ...r, status: activate ? "active" : "suspended" } : r)));
      toast.success(activate ? "Account reactivated" : "Account deactivated", {
        description: activate
          ? `${member.fullName} can sign in again.`
          : `${member.fullName} can no longer sign in, even with the correct password.`,
      });
    } catch (err) {
      toast.error("Couldn't update the account", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    const member = (staff ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deleteStaff(deletingId);
      setStaff((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`${member?.fullName ?? "Staff member"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this staff member", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<StaffMember>[] = [
    { key: "staffCode", header: "ID" },
    { key: "fullName", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (r) => STAFF_ROLE_LABELS[r.role] },
    { key: "jobTitle", header: "Title" },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status === "suspended" ? "Suspended" : "Active"} />,
    },
    {
      key: "id",
      header: "",
      className: "w-10",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" disabled={busyId === r.id} onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => setEditing(r)}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toggleStatus(r)}>
              {r.status === "suspended" ? <Unlock className="size-4" /> : <Lock className="size-4" />}
              {r.status === "suspended" ? "Activate account" : "Deactivate account"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDeletingId(r.id)} className="text-destructive focus:text-destructive">
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
        breadcrumb={["Staff", "Administration", "Staff"]}
        title="Staff"
        description="Accounts, roles and account status."
        actions={<AddStaffDialog onCreated={(m) => setStaff((rows) => [m, ...(rows ?? [])])} />}
      />

      {staff === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={staff} columns={columns} />
      )}

      <EditStaffDialog
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setStaff((rows) => (rows ?? []).map((r) => (r.id === updated.id ? updated : r)));
          setEditing(null);
        }}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes their login and profile. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditStaffDialog({
  member,
  onClose,
  onSaved,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onSaved: (member: StaffMember) => void;
}) {
  const [values, setValues] = useState<EditStaffInput>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setValues({
        fullName: member.fullName,
        phone: member.phone ?? "",
        role: member.role,
        jobTitle: member.jobTitle ?? "",
        department: member.department ?? "",
      });
    }
  }, [member]);

  const set = <K extends keyof EditStaffInput>(k: K) => (v: EditStaffInput[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function handleSubmit() {
    if (!member) return;
    if (!values.fullName?.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await editStaff(member.id, values);
      toast.success("Staff member updated");
      onSaved(updated);
    } catch (err) {
      toast.error("Couldn't save changes", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit staff member</DialogTitle>
          <DialogDescription>Their login email can't be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Full name</Label>
            <Input value={values.fullName ?? ""} onChange={(e) => set("fullName")(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Phone</Label>
              <Input value={values.phone ?? ""} onChange={(e) => set("phone")(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Role</Label>
              <Select value={values.role ?? "staff"} onValueChange={(v) => set("role")(v as StaffRole)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{STAFF_ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Job title</Label>
              <Input value={values.jobTitle ?? ""} onChange={(e) => set("jobTitle")(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Department</Label>
              <Input value={values.department ?? ""} onChange={(e) => set("department")(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
