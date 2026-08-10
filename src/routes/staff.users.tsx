import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { AddStaffDialog } from "@/components/staff/AddStaffDialog";
import { listStaff } from "@/lib/api/staff";
import { STAFF_ROLE_LABELS, type StaffMember } from "@/lib/api/types";

export const Route = createFileRoute("/staff/users")({
  head: () => ({
    meta: [
      { title: "User Management | Dahabo Staff Portal" },
      { name: "description", content: "Staff accounts, assigned roles, branches and account status." },
      { property: "og:title", content: "User Management | Dahabo Staff Portal" },
      { property: "og:description", content: "Staff accounts, assigned roles, branches and account status." },
    ],
  }),
  component: Page,
});

const columns: Column<StaffMember>[] = [
  { key: "staffCode", header: "ID" },
  { key: "fullName", header: "Name" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role", render: (r) => STAFF_ROLE_LABELS[r.role] },
  { key: "jobTitle", header: "Title" },
  { key: "branch", header: "Branch" },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusPill status={r.status === "active" ? "Active" : r.status === "on_leave" ? "Pending" : "Suspended"} />,
  },
];

function Page() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);

  useEffect(() => {
    let active = true;
    listStaff().then((rows) => active && setStaff(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Administration", "Users"]}
        title="User Management"
        description="Accounts, roles and branch assignment."
        actions={<AddStaffDialog onCreated={(m) => setStaff((rows) => [m, ...(rows ?? [])])} />}
      />

      {staff === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={staff} columns={columns} />
      )}
    </>
  );
}
