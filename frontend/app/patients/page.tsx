"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, FileText, Plus, Search, Trash2, UserPen, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { FormInput } from "@/components/FormInput";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse, Appointment, Invoice, Patient, PatientTimeline } from "@/types";

const pageSize = 8;

const blankPatient = {
  name: "",
  phone: "",
  email: ""
};

const getDoctorName = (appointment: Appointment) =>
  typeof appointment.doctorId === "object" ? appointment.doctorId.name : "Doctor";

const groupAppointments = (appointments: Appointment[]) => ({
  previous: appointments.filter((appointment) => appointment.status === "completed"),
  upcoming: appointments.filter((appointment) => ["booked", "confirmed"].includes(appointment.status)),
  pending: appointments.filter((appointment) => appointment.status === "pending_confirmation"),
  declined: appointments.filter((appointment) => appointment.status === "declined")
});

function PatientForm({
  initialValue,
  loading,
  onSubmit
}: {
  initialValue: typeof blankPatient;
  loading: boolean;
  onSubmit: (value: typeof blankPatient) => void;
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
      <FormInput label="Patient name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <FormInput label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
      <FormInput label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <Button type="submit" loading={loading}>
        Save patient
      </Button>
    </form>
  );
}

function TimelineSection({ title, items }: { title: string; items: Appointment[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <h4 className="font-semibold text-slate-950 dark:text-white">{title}</h4>
      <div className="mt-3 grid gap-3">
        {items.length ? (
          items.map((appointment) => (
            <div key={appointment._id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {appointment.date} at {appointment.time}
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-blue-200">
                  {appointment.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-slate-500 dark:text-slate-400">Dr. {getDoctorName(appointment)}</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{appointment.reason || appointment.followUpType || "Dental visit"}</p>
              {appointment.notes ? <p className="mt-1 text-slate-500 dark:text-slate-400">Notes: {appointment.notes}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No records yet.</p>
        )}
      </div>
    </section>
  );
}

function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <h4 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
        <FileText className="h-4 w-4" />
        Invoices
      </h4>
      <div className="mt-3 grid gap-3">
        {invoices.length ? (
          invoices.map((invoice) => (
            <div key={invoice._id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/10">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{invoice.paymentMode || "Invoice"}</p>
                <p className="text-slate-500 dark:text-slate-400">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : ""}</p>
              </div>
              <span className="font-bold text-slate-950 dark:text-white">{formatCurrency(invoice.total)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No invoices yet.</p>
        )}
      </div>
    </section>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<PatientTimeline | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const { showToast } = useToast();

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiResponse<Patient[]>>("/api/patients");
      setPatients(response.data.data);
    } catch {
      showToast("Could not load patients.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return patients.filter((patient) => [patient.name, patient.phone, patient.email].some((value) => value?.toLowerCase().includes(q)));
  }, [patients, query]);

  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const savePatient = async (value: typeof blankPatient, patient?: Patient) => {
    setSaving(true);
    try {
      if (patient) {
        await api.put(`/api/patients/${patient._id}`, value);
        showToast("Patient updated.", "success");
      } else {
        await api.post("/api/patients", value);
        showToast("Patient added.", "success");
      }
      setAddOpen(false);
      setEditing(null);
      await loadPatients();
    } catch {
      showToast("Could not save patient.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deletePatient = async () => {
    if (!deleting) {
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/api/patients/${deleting._id}`);
      showToast("Patient deleted.", "success");
      setDeleting(null);
      await loadPatients();
    } catch {
      showToast("Could not delete patient.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openTimeline = async (patient: Patient) => {
    setTimelineLoading(true);
    setTimeline(null);
    try {
      const response = await api.get<ApiResponse<PatientTimeline>>(`/api/patients/${patient._id}/timeline`);
      setTimeline(response.data.data);
    } catch {
      showToast("Could not load timeline.", "error");
    } finally {
      setTimelineLoading(false);
    }
  };

  const columns: Array<DataTableColumn<Patient>> = [
    { header: "Name", cell: (patient) => <span className="font-semibold text-slate-950 dark:text-white">{patient.name}</span> },
    { header: "Phone", cell: (patient) => patient.phone },
    { header: "Email", cell: (patient) => patient.email || "-" },
    {
      header: "Actions",
      className: "text-right",
      cell: (patient) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" className="h-9 px-3" onClick={() => openTimeline(patient)}>
            <Clock className="h-4 w-4" />
            Timeline
          </Button>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => setEditing(patient)} aria-label="Edit patient">
            <UserPen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-9 w-9 px-0 text-rose-600" onClick={() => setDeleting(patient)} aria-label="Delete patient">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const groupedTimeline = timeline ? groupAppointments(timeline.appointments) : null;

  return (
    <AppShell title="Patients">
      <PageHeader
        title="Patient management"
        description="Search, create, edit, and review the full clinical timeline for every patient."
        badge="Patients"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add patient
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/10">
        <Search className="h-4 w-4" />
        <input
          className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:text-white"
          placeholder="Search by name, phone, or email"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? <SkeletonLoader /> : paginated.length ? <DataTable columns={columns} data={paginated} page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} /> : <EmptyState title="No patients found" description="Add a patient or adjust your search." icon={Users} />}

      <Modal open={addOpen} title="Add patient" onClose={() => setAddOpen(false)}>
        <PatientForm initialValue={blankPatient} loading={saving} onSubmit={(value) => savePatient(value)} />
      </Modal>

      <Modal open={Boolean(editing)} title="Edit patient" onClose={() => setEditing(null)}>
        {editing ? (
          <PatientForm
            initialValue={{ name: editing.name, phone: editing.phone, email: editing.email || "" }}
            loading={saving}
            onSubmit={(value) => savePatient(value, editing)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete patient"
        description={`Delete ${deleting?.name || "this patient"}? This cannot be undone.`}
        loading={saving}
        onClose={() => setDeleting(null)}
        onConfirm={deletePatient}
      />

      <Modal open={timelineLoading || Boolean(timeline)} title="Patient timeline" onClose={() => setTimeline(null)} maxWidth="max-w-4xl">
        {timelineLoading ? <SkeletonLoader /> : null}
        {timeline && groupedTimeline ? (
          <div className="grid gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">{timeline.patient.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {timeline.patient.phone} {timeline.patient.email ? `· ${timeline.patient.email}` : ""}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TimelineSection title="Completed treatments" items={groupedTimeline.previous} />
              <TimelineSection title="Upcoming follow-ups" items={groupedTimeline.upcoming} />
              <TimelineSection title="Pending confirmation follow-ups" items={groupedTimeline.pending} />
              <TimelineSection title="Declined follow-ups" items={groupedTimeline.declined} />
            </div>
            <InvoiceList invoices={timeline.invoices || []} />
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
