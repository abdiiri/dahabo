import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { documents } from "@/data/mock";

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

type Row = (typeof documents)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Document" },
    { key: "type", header: "Type" },
    { key: "size", header: "Size" },
    { key: "owner", header: "Owner" },
    { key: "updated", header: "Updated" },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Documents']} title="Documents" description="Operational and compliance documents." actions={<Button>New record</Button>} />
      
      <DataTable data={documents as Row[]} columns={columns} />
    </>
  );
}
