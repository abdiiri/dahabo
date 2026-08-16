import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { listDocuments, deleteDocument, type DocumentRecord } from "@/lib/api/documents";

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

function Page() {
  const [documents, setDocuments] = useState<DocumentRecord[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listDocuments().then((rows) => active && setDocuments(rows));
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete() {
    if (!deletingId) return;
    const doc = (documents ?? []).find((r) => r.id === deletingId);
    setBusyId(deletingId);
    try {
      await deleteDocument(deletingId);
      setDocuments((rows) => (rows ?? []).filter((r) => r.id !== deletingId));
      toast.success(`${doc?.name ?? "Document"} was removed`);
    } catch (err) {
      toast.error("Couldn't delete this document", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
      setDeletingId(null);
    }
  }

  const columns: Column<DocumentRecord>[] = [
    { key: "documentCode", header: "ID" },
    { key: "name", header: "Document" },
    { key: "type", header: "Type" },
    { key: "fileSizeKb", header: "Size", render: (r) => (r.fileSizeKb != null ? `${r.fileSizeKb} KB` : "—") },
    { key: "ownerName", header: "Owner", render: (r) => r.ownerName ?? "—" },
    { key: "createdAt", header: "Updated", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: "id",
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
      <PageHeader breadcrumb={["Staff", "Documents"]} title="Documents" description="Operational and compliance documents." />

      {documents === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <DataTable data={documents} columns={columns} searchPlaceholder="Search documents…" />
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves it to the Recycle Bin, where it can be restored later or permanently
              deleted.
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
