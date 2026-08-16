import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { listDocuments, type DocumentRecord } from "@/lib/api/documents";

export const Route = createFileRoute("/staff/documents")({
  head: () => ({
    meta: [
      { title: "Documents | Dahabo Staff Portal" },
      { name: "description", content: "Bills of lading, customs declarations, proofs of delivery and certificates." },
      { property: "og:title", content: "Documents | Dahabo Staff Portal" },
      { property: "og:description", content: "Bills of lading, customs declarations, proofs of delivery and certificates." },
    ],
  }),
  component: Page,
});

const columns: Column<DocumentRecord>[] = [
  { key: "documentCode", header: "ID" },
  { key: "name", header: "Document" },
  { key: "type", header: "Type" },
  { key: "fileSizeKb", header: "Size", render: (r) => (r.fileSizeKb != null ? `${r.fileSizeKb} KB` : "—") },
  { key: "ownerName", header: "Owner", render: (r) => r.ownerName ?? "—" },
  { key: "createdAt", header: "Updated", render: (r) => new Date(r.createdAt).toLocaleDateString() },
];

function Page() {
  const [documents, setDocuments] = useState<DocumentRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    listDocuments().then((rows) => active && setDocuments(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Documents"]} title="Documents" description="Operational and compliance documents." />

      {documents === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={documents} columns={columns} searchPlaceholder="Search documents…" />
      )}
    </>
  );
}
