import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Package } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { listShipments } from "@/lib/api/shipments";
import type { Shipment } from "@/lib/api/types";

export const Route = createFileRoute("/staff/shipments")({
  head: () => ({
    meta: [
      { title: "Shipments | Dahabo Staff Portal" },
      { name: "description", content: "Manage every consignment across the network with filters, bulk actions and export." },
      { property: "og:title", content: "Shipments | Dahabo Staff Portal" },
      { property: "og:description", content: "Manage every consignment across the network with filters, bulk actions and export." },
    ],
  }),
  component: Page,
});

const columns: Column<Shipment>[] = [
  { key: "shipmentCode", header: "Waybill" },
  { key: "customer", header: "Customer" },
  { key: "origin", header: "Origin" },
  { key: "destination", header: "Destination" },
  { key: "service", header: "Service" },
  { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
  { key: "eta", header: "ETA" },
  { key: "driver", header: "Driver" },
];

function Page() {
  const [shipments, setShipments] = useState<Shipment[] | null>(null);

  useEffect(() => {
    let active = true;
    listShipments().then((rows) => active && setShipments(rows));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader breadcrumb={["Staff", "Shipments"]} title="Shipments" description="Every consignment across the network." actions={<Button>New record</Button>} />

      {shipments === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Package className="size-8" />
          <p className="text-sm font-medium text-foreground">No shipments yet</p>
          <p className="max-w-sm text-xs">Shipments you record will show up here.</p>
        </div>
      ) : (
        <DataTable data={shipments} columns={columns} />
      )}
    </>
  );
}
