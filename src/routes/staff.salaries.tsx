import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { AddSalaryDialog } from "@/components/staff/AddSalaryDialog";
import { listSalaries, markSalaryPaid } from "@/lib/api/salaries";
import { SALARY_TYPE_LABELS, DRIVER_PAYMENT_STATUS_LABELS, type Salary } from "@/lib/api/types";

export const Route = createFileRoute("/staff/salaries")({
  head: () => ({
    meta: [
      { title: "Salaries & Payments | Dahabo Staff Portal" },
      { name: "description", content: "Optional salary, allowance and bonus payments to drivers, separate from mileage pay." },
    ],
  }),
  component: Page,
});

function Page() {
  const [entries, setEntries] = useState<Salary[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listSalaries().then((rows) => active && setEntries(rows));
    return () => {
      active = false;
    };
  }, []);

  async function markPaid(entry: Salary) {
    setBusyId(entry.id);
    try {
      await markSalaryPaid(entry.id);
      setEntries((rows) => (rows ?? []).map((r) => (r.id === entry.id ? { ...r, status: "paid" } : r)));
      toast.success("Marked paid");
    } catch (err) {
      toast.error("Couldn't update this payment", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Salary>[] = [
    { key: "personName", header: "Driver", render: (r) => r.personName ?? "—" },
    { key: "type", header: "Type", render: (r) => SALARY_TYPE_LABELS[r.type] },
    { key: "periodMonth", header: "Month", render: (r) => new Date(r.periodMonth).toLocaleDateString(undefined, { month: "long", year: "numeric" }) },
    { key: "amount", header: "Amount", render: (r) => `KSh ${r.amount.toLocaleString()}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={DRIVER_PAYMENT_STATUS_LABELS[r.status]} /> },
    {
      key: "id",
      header: "",
      render: (r) =>
        r.status !== "paid" ? (
          <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={(e) => { e.stopPropagation(); markPaid(r); }}>
            Mark paid
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Staff", "Salaries"]}
        title="Salaries & Payments"
        description="Optional — salary, allowance or bonus payments to drivers, separate from automatic mileage pay."
        actions={<AddSalaryDialog onCreated={(e) => setEntries((rows) => [e, ...(rows ?? [])])} />}
      />

      {entries === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={entries} columns={columns} searchPlaceholder="Search payments…" />
      )}
    </>
  );
}
