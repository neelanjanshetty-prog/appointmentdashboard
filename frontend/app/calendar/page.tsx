"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import type { ApiResponse, Appointment, Doctor, Patient } from "@/types";

const getPatient = (appointment: Appointment) => (typeof appointment.patientId === "object" ? (appointment.patientId as Patient) : null);
const getDoctor = (appointment: Appointment) => (typeof appointment.doctorId === "object" ? (appointment.doctorId as Doctor) : null);

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    api
      .get<ApiResponse<Appointment[]>>("/api/appointments")
      .then((response) => setAppointments(response.data.data))
      .catch(() => showToast("Could not load calendar.", "error"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    return appointments.reduce<Record<string, Appointment[]>>((acc, appointment) => {
      acc[appointment.date] = [...(acc[appointment.date] || []), appointment];
      return acc;
    }, {});
  }, [appointments]);

  const dates = Object.keys(grouped).sort();

  return (
    <AppShell title="Calendar">
      <PageHeader title="Clinic calendar" description="Appointments grouped by date with patient confirmation and follow-up signals." badge="Calendar" />
      {loading ? <SkeletonLoader /> : null}
      {!loading && !dates.length ? <EmptyState title="No appointments" description="Scheduled appointments will appear by date." icon={CalendarDays} /> : null}
      <div className="grid gap-4">
        {dates.map((date) => (
          <section key={date} className="glass-panel rounded-2xl p-5">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">{date}</h3>
            <div className="mt-4 grid gap-3">
              {grouped[date]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((appointment) => (
                  <div key={appointment._id} className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">
                          {appointment.time} · {getPatient(appointment)?.name || "Patient"}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-200">
                          Dr. {getDoctor(appointment)?.name || "Doctor"} · {appointment.reason || appointment.followUpType || "Dental visit"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {appointment.status === "pending_confirmation" ? <Badge className="bg-yellow-50 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-200">Pending Patient Confirmation</Badge> : null}
                        {appointment.status === "confirmed" ? <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">Confirmed</Badge> : null}
                        {appointment.status === "declined" ? <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">Declined</Badge> : null}
                        {appointment.parentAppointmentId ? <Badge>Follow-up</Badge> : null}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
