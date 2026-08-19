import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { listAuditLogs, formatAction, formatTarget, type AuditLogEntry } from "@/lib/api/audit-logs";

export const Route = createFileRoute("/staff/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs | Dahabo Staff Portal" },
      { name: "description", content: "Record of actions taken across the operations platform." },
      { property: "og:title", content: "Audit Logs | Dahabo Staff Portal" },
      { property: "og:description", content: "Record of actions taken across the operations platform." },
    ],
  }),
  component: Page,
});

const columns: Column<AuditLogEntry>[] = [
  { key: "createdAt", header: "Time", render: (r) => new Date(r.createdAt).toLocaleString() },
  { key: "actorName", header: "Who", render: (r) => r.actorName ?? "System" },
  { key: "description", header: "Action", render: (r) => r.description ?? formatAction(r.action) },
  { key: "targetTable", header: "Target", render: (r) => formatTarget(r) },
];

function Page() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    listAuditLogs().then((rows) => active && setLogs(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Administration", "Audit Logs"]} title="Audit Logs" description="Every action, actor and timestamp." />

      {logs === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={logs} columns={columns} searchPlaceholder="Search audit logs…" />
      )}
    </>
  );
}
