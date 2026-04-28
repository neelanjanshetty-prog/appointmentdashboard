"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock, FileText, Plus, Search, Trash2, UserPen, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { FormInput } from "@/components/FormInput";
import { IconButton } from "@/components/IconButton";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { SelectInput } from "@/components/SelectInput";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { TextArea } from "@/components/TextArea";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse, Appointment, Doctor, Invoice, Patient, PatientTimeline } from "@/types";

const pageSize = 8;

const blankPatient = {
  name: "",
  phone: "",
  email: ""
};

const followUpTypes = ["Braces adjustment", "Root canal sitting", "Cleaning follow-up", "Implant review", "Aligner review", "General checkup", "Custom"];

const blankFollowUp = {
  doctorId: "",
  date: "",
  time: "",
  followUpType: "General checkup",
  customType: "",
  notes: ""
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
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-white">
                  {appointment.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-slate-500 dark:text-slate-200">Dr. {getDoctorName(appointment)}</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{appointment.reason || appointment.followUpType || "Dental visit"}</p>
              {appointment.notes ? <p className="mt-1 text-slate-500 dark:text-slate-200">Notes: {appointment.notes}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-200">No records yet.</p>
        )}
      </div>
    </section>
  );
}

function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? invoice.total ?? 0), 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.totalPaid ?? invoice.amountPaid ?? 0), 0);
  const outstandingBalance = invoices.reduce((sum, invoice) => {
    const total = Number(invoice.totalAmount ?? invoice.total ?? 0);
    const paid = Number(invoice.totalPaid ?? invoice.amountPaid ?? 0);
    return sum + Number(invoice.balanceDue ?? Math.max(total - paid, 0));
  }, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <h4 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
        <FileText className="h-4 w-4" />
        Financial summary
      </h4>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-200">Total billed</p>
          <p className="font-bold text-slate-950 dark:text-white">{formatCurrency(totalBilled)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-200">Total paid</p>
          <p className="font-bold text-slate-950 dark:text-white">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-200">Outstanding balance</p>
          <p className="font-bold text-slate-950 dark:text-white">{formatCurrency(outstandingBalance)}</p>
        </div>
      </div>
      <h5 className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">Invoice / payment history</h5>
      <div className="mt-3 grid gap-3">
        {invoices.length ? (
          invoices.map((invoice) => (
            <div key={invoice._id} className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{invoice.invoiceNo || invoice.paymentMode || "Invoice"}</p>
                <p className="text-slate-500 dark:text-slate-200">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : ""}</p>
              </div>
              <span><span className="text-slate-500 dark:text-slate-200">Billed </span><strong>{formatCurrency(invoice.totalAmount ?? invoice.total)}</strong></span>
              <span><span className="text-slate-500 dark:text-slate-200">Paid </span><strong>{formatCurrency(invoice.totalPaid ?? invoice.amountPaid ?? 0)}</strong></span>
              <span><span className="text-slate-500 dark:text-slate-200">Balance </span><strong>{formatCurrency(invoice.balanceDue ?? Math.max(Number(invoice.totalAmount ?? invoice.total ?? 0) - Number(invoice.totalPaid ?? invoice.amountPaid ?? 0), 0))}</strong></span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-200">No invoices yet.</p>
        )}
      </div>
    </section>
  );
}

function PatientFollowUpForm({
  patient,
  doctors,
  loading,
  onCancel,
  onSubmit
}: {
  patient: Patient;
  doctors: Doctor[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: typeof blankFollowUp) => void;
}) {
  const [form, setForm] = useState(blankFollowUp);

  useEffect(() => {
    setForm({ ...blankFollowUp, doctorId: doctors[0]?._id || "" });
  }, [doctors, patient._id]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-400/10 dark:text-white">
        Scheduling follow-up for <span className="font-semibold">{patient.name}</span>.
      </div>
      <SelectInput label="Doctor" value={form.doctorId} onChange={(event) => setForm({ ...form, doctorId: event.target.value })} required>
        <option value="">Select doctor</option>
        {doctors.map((doctor) => (
          <option key={doctor._id} value={doctor._id}>
            Dr. {doctor.name}
          </option>
        ))}
      </SelectInput>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
        <FormInput label="Time" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
      </div>
      <SelectInput label="Follow-up type" value={form.followUpType} onChange={(event) => setForm({ ...form, followUpType: event.target.value })}>
        {followUpTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </SelectInput>
      {form.followUpType === "Custom" ? (
        <FormInput label="Custom follow-up type" value={form.customType} onChange={(event) => setForm({ ...form, customType: event.target.value })} required />
      ) : null}
      <TextArea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          <CalendarPlus className="h-4 w-4" />
          Book follow-up
        </Button>
      </div>
    </form>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [followUpPatient, setFollowUpPatient] = useState<Patient | null>(null);
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

  const loadDoctors = async () => {
    try {
      const response = await api.get<ApiResponse<Doctor[]>>("/api/doctors");
      setDoctors(response.data.data);
    } catch {
      showToast("Could not load doctors.", "error");
    }
  };

  useEffect(() => {
    loadPatients();
    loadDoctors();
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

  const bookPatientFollowUp = async (value: typeof blankFollowUp) => {
    if (!followUpPatient) {
      return;
    }

    const followUpType = value.followUpType === "Custom" ? value.customType : value.followUpType;

    setSaving(true);
    try {
      await api.post("/api/appointments", {
        patientId: followUpPatient._id,
        doctorId: value.doctorId,
        date: value.date,
        time: value.time,
        reason: followUpType,
        notes: value.notes
      });
      showToast("Follow-up appointment booked.", "success");
      setFollowUpPatient(null);
    } catch {
      showToast("Could not book follow-up appointment.", "error");
    } finally {
      setSaving(false);
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
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" className="h-9 px-3" onClick={() => openTimeline(patient)}>
            <Clock className="h-4 w-4" />
            Timeline
          </Button>
          <Button variant="secondary" className="h-9 px-3 text-blue-700 dark:text-white" onClick={() => setFollowUpPatient(patient)}>
            <CalendarPlus className="h-4 w-4" />
            Follow-up
          </Button>
          <IconButton onClick={() => setEditing(patient)} aria-label="Edit patient" title="Edit patient">
            <UserPen className="h-5 w-5" />
          </IconButton>
          <IconButton tone="danger" onClick={() => setDeleting(patient)} aria-label="Delete patient" title="Delete patient">
            <Trash2 className="h-5 w-5" />
          </IconButton>
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

      <Modal open={Boolean(followUpPatient)} title="Book follow-up appointment" onClose={() => setFollowUpPatient(null)} maxWidth="max-w-2xl">
        {followUpPatient ? (
          <PatientFollowUpForm
            patient={followUpPatient}
            doctors={doctors}
            loading={saving}
            onCancel={() => setFollowUpPatient(null)}
            onSubmit={bookPatientFollowUp}
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
              <p className="text-sm text-slate-500 dark:text-slate-200">
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
