"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, FilePenLine, Pill, Plus, Printer, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { IconButton } from "@/components/IconButton";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { prescriptionApi } from "@/lib/prescriptions";
import type { Prescription } from "@/types";

const pageSize = 8;

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Prescription | null>(null);
  const { showToast } = useToast();

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await prescriptionApi.list();
      setPrescriptions(response.data.data);
    } catch {
      showToast("Could not load prescriptions.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return prescriptions.filter((prescription) =>
      [
        prescription.prescriptionNo,
        prescription.patientName,
        prescription.patientPhone,
        prescription.doctorName,
        prescription.date,
        prescription.diagnosis
      ].some((value) => value?.toLowerCase().includes(q))
    );
  }, [prescriptions, query]);

  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const deletePrescription = async () => {
    if (!deleting) {
      return;
    }

    setSaving(true);
    try {
      await prescriptionApi.remove(deleting._id);
      showToast("Prescription deleted.", "success");
      setDeleting(null);
      await loadPrescriptions();
    } catch {
      showToast("Could not delete prescription.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns: Array<DataTableColumn<Prescription>> = [
    {
      header: "Prescription No",
      cell: (prescription) => <span className="font-semibold text-slate-950 dark:text-white">{prescription.prescriptionNo}</span>
    },
    { header: "Date", cell: (prescription) => prescription.date },
    { header: "Patient", cell: (prescription) => prescription.patientName },
    { header: "Doctor", cell: (prescription) => `Dr. ${prescription.doctorName}` },
    { header: "Diagnosis", cell: (prescription) => prescription.diagnosis || "-" },
    {
      header: "Actions",
      className: "text-right",
      cell: (prescription) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/prescriptions/${prescription._id}`}>
            <Button variant="secondary" className="h-10 px-3">
              <Eye className="h-5 w-5" />
              View
            </Button>
          </Link>
          <Link href={`/prescriptions/${prescription._id}`}>
            <Button variant="secondary" className="h-10 px-3" title="Print prescription">
              <Printer className="h-5 w-5" />
            </Button>
          </Link>
          <Link href={`/prescriptions/${prescription._id}/edit`}>
            <IconButton aria-label="Edit prescription" title="Edit prescription">
              <FilePenLine className="h-5 w-5" />
            </IconButton>
          </Link>
          <IconButton tone="danger" onClick={() => setDeleting(prescription)} aria-label="Delete prescription" title="Delete prescription">
            <Trash2 className="h-5 w-5" />
          </IconButton>
        </div>
      )
    }
  ];

  return (
    <AppShell title="Digital Prescription">
      <PageHeader
        title="Digital prescriptions"
        description="Create, review, edit, and print patient prescriptions with Rx medicine instructions."
        badge="Rx"
        action={
          <Link href="/prescriptions/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create prescription
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
        <Search className="h-4 w-4" />
        <input
          className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:text-white"
          placeholder="Search prescription, patient, doctor, diagnosis, or date"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? <SkeletonLoader /> : paginated.length ? (
        <DataTable columns={columns} data={paginated} page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      ) : (
        <EmptyState title="No prescriptions" description="Create the first digital prescription for a patient." icon={Pill} />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete prescription"
        description={`Delete prescription ${deleting?.prescriptionNo || ""}? This cannot be undone.`}
        loading={saving}
        onClose={() => setDeleting(null)}
        onConfirm={deletePrescription}
      />
    </AppShell>
  );
}
