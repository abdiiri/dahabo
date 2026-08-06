import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { auditLogs } from "@/data/mock";

export const Route = createFileRoute("/staff/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs | Dahabo Staff Portal" },
      { name: "description", content: "Immutable record of every action taken across the operations platform." },
      { property: "og:title", content: "Audit Logs | Dahabo Staff Portal" },
      { property: "og:description", content: "Immutable record of every action taken across the operations platform." },
    ],
  }),
  component: Page,
});

type Row = (typeof auditLogs)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "ID" },
    { key: "actor", header: "Actor" },
    { key: "action", header: "Action" },
    { key: "target", header: "Target" },
    { key: "ip", header: "IP" },
    { key: "time", header: "Time" },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Administration', 'Audit Logs']} title="Audit Logs" description="Every action, actor and timestamp." actions={<Button>New record</Button>} />
      
      <DataTable data={auditLogs as Row[]} columns={columns} />
    </>
  );
}
