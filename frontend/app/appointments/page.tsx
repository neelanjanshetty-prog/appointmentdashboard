"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ClipboardList, Pill, Plus, Search, Trash2, UserPen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
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
import type { ApiResponse, Appointment, AppointmentStatus, Doctor, Patient } from "@/types";

const pageSize = 8;
const statuses: AppointmentStatus[] = ["booked", "pending_confirmation", "confirmed", "completed", "cancelled", "declined"];
const followUpTypes = ["Braces adjustment", "Root canal sitting", "Cleaning follow-up", "Implant review", "Aligner review", "General checkup", "Custom"];

const blankAppointment = {
  patientId: "",
  doctorId: "",
  date: "",
  time: "",
  reason: "",
  notes: "",
  status: "booked" as AppointmentStatus
};

const blankFollowUp = {
  needed: "yes",
  followUpType: "Braces adjustment",
  customType: "",
  date: "",
  time: "",
  doctorId: "",
  notes: ""
};

const statusStyles: Record<AppointmentStatus, string> = {
  booked: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-white",
  pending_confirmation: "bg-yellow-50 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-200",
  confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200",
  completed: "bg-purple-50 text-purple-700 dark:bg-purple-400/10 dark:text-purple-200",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  declined: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
};

const labelStatus = (status: AppointmentStatus) =>
  status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getPatient = (appointment: Appointment) => (typeof appointment.patientId === "object" ? appointment.patientId : null);
const getDoctor = (appointment: Appointment) => (typeof appointment.doctorId === "object" ? appointment.doctorId : null);

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>{labelStatus(status)}</span>;
}

function AppointmentForm({
  initialValue,
  patients,
  doctors,
  loading,
  onSubmit
}: {
  initialValue: typeof blankAppointment;
  patients: Patient[];
  doctors: Doctor[];
  loading: boolean;
  onSubmit: (value: typeof blankAppointment) => void;
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
      <div className="grid gap-4 md:grid-cols-2">
        <SelectInput label="Patient" value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} required>
          <option value="">Select patient</option>
          {patients.map((patient) => (
            <option key={patient._id} value={patient._id}>
              {patient.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput label="Doctor" value={form.doctorId} onChange={(event) => setForm({ ...form, doctorId: event.target.value })} required>
          <option value="">Select doctor</option>
          {doctors.map((doctor) => (
            <option key={doctor._id} value={doctor._id}>
              Dr. {doctor.name}
            </option>
          ))}
        </SelectInput>
        <FormInput label="Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
        <FormInput label="Time" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
      </div>
      <FormInput label="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
      <TextArea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <Button type="submit" loading={loading}>
        Save appointment
      </Button>
    </form>
  );
}

function FollowUpForm({
  appointment,
  doctors,
  loading,
  onCancel,
  onSubmit
}: {
  appointment: Appointment;
  doctors: Doctor[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: typeof blankFollowUp) => void;
}) {
  const initialDoctor = getDoctor(appointment)?._id || "";
  const [form, setForm] = useState({ ...blankFollowUp, doctorId: initialDoctor });

  useEffect(() => {
    setForm({ ...blankFollowUp, doctorId: initialDoctor });
  }, [appointment._id, initialDoctor]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <SelectInput label="Next appointment needed" value={form.needed} onChange={(event) => setForm({ ...form, needed: event.target.value })}>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </SelectInput>

      {form.needed === "yes" ? (
        <>
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
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Suggested interval</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[7, 15, 30, 45].map((days) => (
                <Button key={days} type="button" variant="secondary" className="h-9" onClick={() => setForm({ ...form, date: addDays(days) })}>
                  {days} days
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Custom date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
            <FormInput label="Time" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
          </div>
          <SelectInput label="Doctor" value={form.doctorId} onChange={(event) => setForm({ ...form, doctorId: event.target.value })} required>
            <option value="">Select doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                Dr. {doctor.name}
              </option>
            ))}
          </SelectInput>
          <TextArea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Skip
        </Button>
        <Button type="submit" loading={loading}>
          Send Confirmation Request
        </Button>
      </div>
    </form>
  );
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState<Appointment | null>(null);
  const [followUpAppointment, setFollowUpAppointment] = useState<Appointment | null>(null);
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [appointmentsResponse, patientsResponse, doctorsResponse] = await Promise.all([
        api.get<ApiResponse<Appointment[]>>("/api/appointments"),
        api.get<ApiResponse<Patient[]>>("/api/patients"),
        api.get<ApiResponse<Doctor[]>>("/api/doctors")
      ]);
      setAppointments(appointmentsResponse.data.data);
      setPatients(patientsResponse.data.data);
      setDoctors(doctorsResponse.data.data);
    } catch {
      showToast("Could not load appointments.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return appointments.filter((appointment) => {
      const patient = getPatient(appointment);
      const doctor = getDoctor(appointment);
      return [patient?.name, doctor?.name, appointment.date, appointment.time, appointment.reason, appointment.status].some((value) =>
        value?.toLowerCase().includes(q)
      );
    });
  }, [appointments, query]);

  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const saveAppointment = async (value: typeof blankAppointment, appointment?: Appointment) => {
    setSaving(true);
    try {
      if (appointment) {
        await api.put(`/api/appointments/${appointment._id}`, value);
        showToast("Appointment updated.", "success");
      } else {
        await api.post("/api/appointments", value);
        showToast("Appointment booked. WhatsApp sent to patient and doctor.", "success");
      }
      setAddOpen(false);
      setEditing(null);
      await loadData();
    } catch {
      showToast("Could not save appointment.", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (appointment: Appointment, status: AppointmentStatus) => {
    setSaving(true);
    try {
      const response = await api.put<ApiResponse<Appointment>>(`/api/appointments/${appointment._id}`, { status });
      showToast("Appointment status updated.", "success");
      await loadData();
      if (status === "completed") {
        setFollowUpAppointment(response.data.data);
      }
    } catch {
      showToast("Could not update status.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteAppointment = async () => {
    if (!deleting) {
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/api/appointments/${deleting._id}`);
      showToast("Appointment deleted.", "success");
      setDeleting(null);
      await loadData();
    } catch {
      showToast("Could not delete appointment.", "error");
    } finally {
      setSaving(false);
    }
  };

  const sendFollowUp = async (value: typeof blankFollowUp) => {
    if (!followUpAppointment) {
      return;
    }

    if (value.needed === "no") {
      setFollowUpAppointment(null);
      showToast("No follow-up scheduled.", "info");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/api/appointments/${followUpAppointment._id}/follow-up`, {
        date: value.date,
        time: value.time,
        doctorId: value.doctorId,
        followUpType: value.followUpType === "Custom" ? value.customType : value.followUpType,
        notes: value.notes
      });
      showToast("Confirmation request sent to patient. Appointment is pending confirmation.", "success");
      setFollowUpAppointment(null);
      await loadData();
    } catch {
      showToast("Could not send confirmation request.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns: Array<DataTableColumn<Appointment>> = [
    {
      header: "Patient",
      cell: (appointment) => <span className="font-semibold text-slate-950 dark:text-white">{getPatient(appointment)?.name || "-"}</span>
    },
    { header: "Doctor", cell: (appointment) => `Dr. ${getDoctor(appointment)?.name || "-"}` },
    { header: "Date", cell: (appointment) => appointment.date },
    { header: "Time", cell: (appointment) => appointment.time },
    { header: "Reason", cell: (appointment) => appointment.reason || "-" },
    {
      header: "Status",
      cell: (appointment) => (
        <div className="grid gap-2">
          <StatusBadge status={appointment.status} />
          {appointment.parentAppointmentId ? <Badge>Follow-up</Badge> : null}
          <SelectInput label="Update status" value={appointment.status} onChange={(event) => updateStatus(appointment, event.target.value as AppointmentStatus)}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {labelStatus(status)}
              </option>
            ))}
          </SelectInput>
        </div>
      )
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (appointment) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            className="h-10 px-3 text-blue-700 dark:text-white"
            onClick={() => setFollowUpAppointment(appointment)}
            aria-label="Schedule follow-up appointment"
          >
            <CalendarPlus className="h-4 w-4" />
            Follow-up
          </Button>
          <Link href={`/prescriptions/new?appointmentId=${appointment._id}`}>
            <Button variant="secondary" className="h-10 px-3" aria-label="Create prescription from appointment">
              <Pill className="h-4 w-4" />
              Prescription
            </Button>
          </Link>
          <IconButton onClick={() => setEditing(appointment)} aria-label="Edit appointment" title="Edit appointment">
            <UserPen className="h-5 w-5" />
          </IconButton>
          <IconButton tone="danger" onClick={() => setDeleting(appointment)} aria-label="Delete appointment" title="Delete appointment">
            <Trash2 className="h-5 w-5" />
          </IconButton>
        </div>
      )
    }
  ];

  return (
    <AppShell title="Appointments">
      <PageHeader
        title="Appointment management"
        description="Book appointments, update statuses, and trigger WhatsApp follow-up confirmation requests."
        badge="Appointments"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add appointment
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/10">
        <Search className="h-4 w-4" />
        <input
          className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:text-white"
          placeholder="Search patient, doctor, date, reason, or status"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? <SkeletonLoader /> : paginated.length ? <DataTable columns={columns} data={paginated} page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} /> : <EmptyState title="No appointments found" description="Create an appointment to begin booking workflows." icon={ClipboardList} />}

      <Modal open={addOpen} title="Add appointment" onClose={() => setAddOpen(false)} maxWidth="max-w-2xl">
        <AppointmentForm initialValue={blankAppointment} patients={patients} doctors={doctors} loading={saving} onSubmit={(value) => saveAppointment(value)} />
      </Modal>

      <Modal open={Boolean(editing)} title="Edit appointment" onClose={() => setEditing(null)} maxWidth="max-w-2xl">
        {editing ? (
          <AppointmentForm
            initialValue={{
              patientId: getPatient(editing)?._id || "",
              doctorId: getDoctor(editing)?._id || "",
              date: editing.date,
              time: editing.time,
              reason: editing.reason || "",
              notes: editing.notes || "",
              status: editing.status
            }}
            patients={patients}
            doctors={doctors}
            loading={saving}
            onSubmit={(value) => saveAppointment(value, editing)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete appointment"
        description="Delete this appointment? This cannot be undone."
        loading={saving}
        onClose={() => setDeleting(null)}
        onConfirm={deleteAppointment}
      />

      <Modal open={Boolean(followUpAppointment)} title="Schedule next appointment?" onClose={() => setFollowUpAppointment(null)} maxWidth="max-w-2xl">
        {followUpAppointment ? (
          <div className="grid gap-4">
            <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-400/10 dark:text-white">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarPlus className="h-4 w-4" />
                Follow-up will remain pending until the patient replies YES on WhatsApp.
              </div>
            </div>
            <FollowUpForm
              appointment={followUpAppointment}
              doctors={doctors}
              loading={saving}
              onCancel={() => setFollowUpAppointment(null)}
              onSubmit={sendFollowUp}
            />
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
