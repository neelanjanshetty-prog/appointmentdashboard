"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search, Stethoscope, Trash2, UserPen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { FormInput } from "@/components/FormInput";
import { IconButton } from "@/components/IconButton";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import type { ApiResponse, Doctor } from "@/types";

const pageSize = 8;

const blankDoctor = {
  name: "",
  specialization: "",
  phone: "",
  email: ""
};

function DoctorForm({
  initialValue,
  loading,
  onSubmit
}: {
  initialValue: typeof blankDoctor;
  loading: boolean;
  onSubmit: (value: typeof blankDoctor) => void;
}) {
  const [form, setForm] = useState(initialValue);

  useEffect(() => {
    setForm(initialValue);
  }, [initialValue]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormInput label="Doctor name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <FormInput
        label="Specialization"
        value={form.specialization}
        onChange={(event) => setForm({ ...form, specialization: event.target.value })}
        required
      />
      <FormInput label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <FormInput label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <Button type="submit" loading={loading}>
        Save doctor
      </Button>
    </form>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [deleting, setDeleting] = useState<Doctor | null>(null);
  const { showToast } = useToast();

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiResponse<Doctor[]>>("/api/doctors");
      setDoctors(response.data.data);
    } catch {
      showToast("Could not load doctors.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return doctors.filter((doctor) => [doctor.name, doctor.specialization, doctor.phone, doctor.email].some((value) => value?.toLowerCase().includes(q)));
  }, [doctors, query]);

  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const saveDoctor = async (value: typeof blankDoctor, doctor?: Doctor) => {
    setSaving(true);
    try {
      if (doctor) {
        await api.put(`/api/doctors/${doctor._id}`, value);
        showToast("Doctor updated.", "success");
      } else {
        await api.post("/api/doctors", value);
        showToast("Doctor added.", "success");
      }
      setAddOpen(false);
      setEditing(null);
      await loadDoctors();
    } catch {
      showToast("Could not save doctor.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteDoctor = async () => {
    if (!deleting) {
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/api/doctors/${deleting._id}`);
      showToast("Doctor deleted.", "success");
      setDeleting(null);
      await loadDoctors();
    } catch {
      showToast("Could not delete doctor.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns: Array<DataTableColumn<Doctor>> = [
    { header: "Name", cell: (doctor) => <span className="font-semibold text-slate-950 dark:text-white">{doctor.name}</span> },
    { header: "Specialization", cell: (doctor) => doctor.specialization },
    { header: "Phone", cell: (doctor) => doctor.phone || "-" },
    { header: "Email", cell: (doctor) => doctor.email || "-" },
    {
      header: "Actions",
      className: "text-right",
      cell: (doctor) => (
        <div className="flex justify-end gap-2">
          <IconButton onClick={() => setEditing(doctor)} aria-label="Edit doctor" title="Edit doctor">
            <UserPen className="h-5 w-5" />
          </IconButton>
          <IconButton tone="danger" onClick={() => setDeleting(doctor)} aria-label="Delete doctor" title="Delete doctor">
            <Trash2 className="h-5 w-5" />
          </IconButton>
        </div>
      )
    }
  ];

  return (
    <AppShell title="Doctors">
      <PageHeader
        title="Doctor management"
        description="Keep doctor profiles ready for appointment booking and follow-up assignment."
        badge="Doctors"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add doctor
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/10">
        <Search className="h-4 w-4" />
        <input
          className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:text-white"
          placeholder="Search by doctor, specialization, phone, or email"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? <SkeletonLoader /> : paginated.length ? <DataTable columns={columns} data={paginated} page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} /> : <EmptyState title="No doctors found" description="Add a doctor or adjust your search." icon={Stethoscope} />}

      <Modal open={addOpen} title="Add doctor" onClose={() => setAddOpen(false)}>
        <DoctorForm initialValue={blankDoctor} loading={saving} onSubmit={(value) => saveDoctor(value)} />
      </Modal>

      <Modal open={Boolean(editing)} title="Edit doctor" onClose={() => setEditing(null)}>
        {editing ? (
          <DoctorForm
            initialValue={{
              name: editing.name,
              specialization: editing.specialization,
              phone: editing.phone || "",
              email: editing.email || ""
            }}
            loading={saving}
            onSubmit={(value) => saveDoctor(value, editing)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete doctor"
        description={`Delete Dr. ${deleting?.name || "this doctor"}?`}
        loading={saving}
        onClose={() => setDeleting(null)}
        onConfirm={deleteDoctor}
      />
    </AppShell>
  );
}
