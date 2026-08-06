import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { staffUsers } from "@/data/mock";

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

type Row = (typeof staffUsers)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "branch", header: "Branch" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Administration', 'Users']} title="User Management" description="Accounts, roles and branch assignment." actions={<Button>New record</Button>} />
      
      <DataTable data={staffUsers as Row[]} columns={columns} />
    </>
  );
}
