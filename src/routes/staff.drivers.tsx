import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { driversData } from "@/data/mock";

export const Route = createFileRoute("/staff/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers | Dahabo Staff Portal" },
      { name: "description", content: "Driver roster, licences, assigned vehicles, trips and ratings." },
      { property: "og:title", content: "Drivers | Dahabo Staff Portal" },
      { property: "og:description", content: "Driver roster, licences, assigned vehicles, trips and ratings." },
    ],
  }),
  component: Page,
});

type Row = (typeof driversData)[number];

const columns: Column<Row>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Driver" },
    { key: "license", header: "Licence" },
    { key: "vehicle", header: "Vehicle" },
    { key: "base", header: "Base" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
    { key: "trips", header: "Trips" },
    { key: "rating", header: "Rating" },
];

function Page() {
  return (
    <>
      <PageHeader breadcrumb={['Staff', 'Drivers']} title="Drivers" description="Roster, assignments and performance." actions={<Button>New record</Button>} />
      
      <DataTable data={driversData as Row[]} columns={columns} />
    </>
  );
}
