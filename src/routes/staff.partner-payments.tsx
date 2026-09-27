import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Loader2,
  MoreHorizontal,
  Trash2,
  BadgeCheck,
  Wallet,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, recentMonthOptions, monthLabel, isInMonth } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { StatusPill } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
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
import {
  listPartnerJobs,
  updatePartnerJobStatus,
  deletePartnerJob,
} from "@/lib/api/partner-jobs";
import { DRIVER_PAYMENT_STATUS_LABELS, type PartnerJob, type DriverPaymentStatus } from "@/lib/api/types";
import { useRefetchOnFocus } from "@/lib/use-refetch-on-focus";

type PartnerPaymentsSearch = { partner?: string | undefined };

export const Route = createFileRoute("/staff/partner-payments")({
  head: () => ({
    meta: [
      { title: "Partner Payments | Dahabo Staff Portal" },
      {
        name: "description",
        content: "Jobs handed to Partner Fleet owner-operators, and what's owed to each.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): PartnerPaymentsSearch => ({
    partner: typeof search["partner"] === "string" ? search["partner"] : undefined,
  }),
  component: Page,
});

function Page() {
  const { partner: partnerFilterFromUrl } = Route.useSearch();
  const monthOptions = recentMonthOptions();
  const [month, setMonth] = useState(monthOptions[0]);
  const [jobs, setJobs] = useState<PartnerJob[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<DriverPaymentStatus | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    listPartnerJobs().then(setJobs);
  }

  useEffect(() => {
    let active = true;
    listPartnerJobs().then((rows) => active && setJobs(rows));
    return () => {
      active = false;
    };
  }, []);

  useRefetchOnFocus(refresh);

  const monthJobs = useMemo(() => {
    const rows = (jobs ?? []).filter((j) => isInMonth(j.createdAt, month));
    if (!partnerFilterFromUrl) return rows;
    return rows.filter((j) => j.partnerId === partnerFilterFromUrl);
  }, [jobs, month, partnerFilterFromUrl]);

  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return monthJobs;
    return monthJobs.filter((j) => j.status === statusFilter);
  }, [monthJobs, statusFilter]);

  // Totals reflect the selected month (and the partner filter, if arrived
  // via "View jobs & payments" from a specific partner's row) regardless
  // of the status filter — same convention Driver Payments uses.
  const totals = useMemo(() => {
    const sum = (status: DriverPaymentStatus) =>
      monthJobs.filter((j) => j.status === status).reduce((acc, j) => acc + j.payoutAmount, 0);
    const margin = monthJobs.reduce(
      (acc, j) => acc + (j.agreedAmount !== undefined ? j.agreedAmount - j.payoutAmount : 0),
      0,
    );
    return { pending: sum("pending"), approved: sum("approved"), paid: sum("paid"), margin };
  }, [monthJobs]);

  async function setStatus(job: PartnerJob, status: DriverPaymentStatus) {
    setBusyId(job.id);
    try {
      await updatePartnerJobStatus(job.id, status);
      setJobs((rows) => (rows ?? []).map((r) => (r.id === job.id ? { ...r, status } : r)));
      toast.success(status === "paid" ? "Marked as paid" : "Marked as approved");
    } catch (err) {
      toast.error("Couldn't update this job", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setBusyId(deletingId);
    try {
      await deletePartnerJob(deletingId);
      setJobs((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success("Partner job was removed");
    } catch (err) {
      toast.error("Couldn't delete this job", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<PartnerJob>[] = [
    { key: "orderCode", header: "Order", render: (r) => r.orderCode ?? "—" },
    { key: "partnerName", header: "Partner", render: (r) => r.partnerName ?? "—" },
    { key: "customerName", header: "Customer", render: (r) => r.customerName ?? "—" },
    {
      key: "agreedAmount",
      header: "Customer paid",
      render: (r) => (r.agreedAmount !== undefined ? `KSh ${r.agreedAmount.toLocaleString()}` : "—"),
    },
    {
      key: "payoutAmount",
      header: "Partner payout",
      render: (r) => `KSh ${r.payoutAmount.toLocaleString()}`,
    },
    {
      key: "id",
      header: "Margin",
      render: (r) =>
        r.agreedAmount !== undefined
          ? `KSh ${(r.agreedAmount - r.payoutAmount).toLocaleString()}`
          : "—",
    },
    {
      key: "createdAt",
      header: "Date",
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={DRIVER_PAYMENT_STATUS_LABELS[r.status]} />,
    },
    {
      key: "partnerId",
      header: "",
      className: "w-10",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={busyId === r.id}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {r.status === "pending" ? (
              <DropdownMenuItem onSelect={() => setStatus(r, "approved")}>
                <BadgeCheck className="size-4" /> Approve
              </DropdownMenuItem>
            ) : null}
            {r.status !== "paid" ? (
              <DropdownMenuItem onSelect={() => setStatus(r, "paid")}>
                <Wallet className="size-4" /> Mark paid
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() => setDeletingId(r.id)}
              className="text-destructive focus:text-destructive"
            >
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
        breadcrumb={["Staff", "Partner Payments"]}
        title="Partner Payments"
        description="One row per job handed to a Partner Fleet owner-operator — what the customer paid, what the partner is owed, and your margin."
        actions={
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {jobs === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-4">
            <StatCard
              label="Pending"
              value={`KSh ${totals.pending.toLocaleString()}`}
              icon={Clock}
              tone="warning"
            />
            <StatCard
              label="Approved"
              value={`KSh ${totals.approved.toLocaleString()}`}
              icon={BadgeCheck}
              tone="default"
            />
            <StatCard
              label="Paid"
              value={`KSh ${totals.paid.toLocaleString()}`}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label="Your margin"
              value={`KSh ${totals.margin.toLocaleString()}`}
              icon={TrendingUp}
              tone="default"
            />
          </section>

          <DataTable
            data={filteredJobs}
            columns={columns}
            searchPlaceholder="Search partner jobs…"
            exportFilename="partner-payments"
            toolbar={
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as DriverPaymentStatus | "all")}
              >
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.keys(DRIVER_PAYMENT_STATUS_LABELS) as DriverPaymentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {DRIVER_PAYMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </>
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this partner job?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves it to the Recycle Bin. It can be restored from there, or permanently
              removed later. The order and the partner themselves aren't affected — only this job
              record is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
