"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, IndianRupee, MessageCircle, Package, Stethoscope, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsOverview, ApiResponse, Appointment, Doctor, Patient } from "@/types";

const objectToChart = (data: Record<string, number>, valueKey = "value") =>
  Object.entries(data || {}).map(([name, value]) => ({ name, [valueKey]: value }));

const getPatient = (appointment: Appointment) => (typeof appointment.patientId === "object" ? (appointment.patientId as Patient) : null);
const getDoctor = (appointment: Appointment) => (typeof appointment.doctorId === "object" ? (appointment.doctorId as Doctor) : null);

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [analyticsResponse, appointmentResponse] = await Promise.all([
          api.get<ApiResponse<AnalyticsOverview>>("/api/analytics/overview"),
          api.get<ApiResponse<Appointment[]>>("/api/appointments")
        ]);
        setAnalytics(analyticsResponse.data.data);
        setAppointments(appointmentResponse.data.data);
      } catch {
        showToast("Could not load dashboard data.", "error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const appointmentStatusData = useMemo(() => {
    const counts = appointments.reduce<Record<string, number>>((acc, appointment) => {
      acc[appointment.status] = (acc[appointment.status] || 0) + 1;
      return acc;
    }, {});
    return objectToChart(counts, "appointments");
  }, [appointments]);

  const recentAppointments = appointments.slice(0, 5);
  const pendingAppointments = appointments.filter((appointment) => appointment.status === "pending_confirmation").slice(0, 4);

  return (
    <AppShell title="Dashboard">
      <PageHeader title="Clinic command center" description="Live operational pulse across patients, appointments, follow-ups, revenue, and stock risk." badge="Overview" />

      {loading ? <SkeletonLoader /> : null}
      {!loading && analytics ? (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total patients" value={String(analytics.totalPatients)} icon={Users} />
            <KpiCard label="Total appointments" value={String(analytics.totalAppointments)} icon={CalendarCheck} />
            <KpiCard label="Total revenue" value={formatCurrency(analytics.totalRevenue)} icon={IndianRupee} />
            <KpiCard label="Today appointments" value={String(analytics.todayAppointments)} icon={Stethoscope} />
            <KpiCard label="Upcoming follow-ups" value={String(analytics.upcomingFollowUps)} icon={TrendingUp} />
            <KpiCard label="Pending confirmations" value={String(analytics.pendingConfirmations)} icon={MessageCircle} />
            <KpiCard label="Confirmed follow-ups" value={String(analytics.confirmedFollowUps)} icon={CalendarCheck} />
            <KpiCard label="Declined follow-ups" value={String(analytics.declinedFollowUps)} icon={AlertTriangle} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartPanel title="Patient growth">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={objectToChart(analytics.monthlyPatientFlow, "patients")}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="patients" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Appointments by status">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="appointments" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Revenue trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={objectToChart(analytics.monthlyRevenue, "revenue")}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Follow-up confirmations">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Confirmed", value: analytics.confirmedFollowUps },
                    { name: "Pending", value: analytics.pendingConfirmations },
                    { name: "Declined", value: analytics.declinedFollowUps }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="glass-panel rounded-2xl p-5 xl:col-span-1">
              <h3 className="font-semibold text-slate-950 dark:text-white">Recent appointments</h3>
              <div className="mt-4 grid gap-3">
                {recentAppointments.length ? (
                  recentAppointments.map((appointment) => (
                    <div key={appointment._id} className="rounded-xl bg-white/60 p-3 text-sm dark:bg-white/5">
                      <p className="font-semibold text-slate-950 dark:text-white">{getPatient(appointment)?.name || "Patient"}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Dr. {getDoctor(appointment)?.name || "Doctor"} · {appointment.date} · {appointment.time}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No appointments" description="Recent bookings will show here." icon={CalendarCheck} />
                )}
              </div>
            </section>
            <section className="glass-panel rounded-2xl p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">Low stock alerts</h3>
              <div className="mt-4 grid gap-3">
                {analytics.lowStockItems.length ? (
                  analytics.lowStockItems.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex items-center justify-between rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                      <span>{item.itemName}</span>
                      <Badge>{item.quantity} left</Badge>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Stock looks good" description="No low stock alerts right now." icon={Package} />
                )}
              </div>
            </section>
            <section className="glass-panel rounded-2xl p-5">
              <h3 className="font-semibold text-slate-950 dark:text-white">Pending patient confirmations</h3>
              <div className="mt-4 grid gap-3">
                {pendingAppointments.length ? (
                  pendingAppointments.map((appointment) => (
                    <div key={appointment._id} className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-200">
                      <p className="font-semibold">{getPatient(appointment)?.name || "Patient"}</p>
                      <p>{appointment.date} at {appointment.time}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Nothing pending" description="Patient confirmation requests will appear here." icon={MessageCircle} />
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
