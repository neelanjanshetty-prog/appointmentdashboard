"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, BarChart3, IndianRupee, MessageCircle, Package, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/AppShell";
import { chartAxisProps, chartGridProps, chartTooltipProps } from "@/components/chartTheme";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsOverview, ApiResponse } from "@/types";

const objectToChart = (data: Record<string, number>, valueKey = "value") =>
  Object.entries(data || {}).map(([name, value]) => ({ name, [valueKey]: value }));

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-4 h-72">{children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    api
      .get<ApiResponse<AnalyticsOverview>>("/api/analytics/overview")
      .then((response) => setAnalytics(response.data.data))
      .catch(() => showToast("Could not load analytics.", "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Analytics">
      <PageHeader title="Analytics" description="Clinical growth, follow-up conversion, revenue, and stock intelligence." badge="Insights" />
      {loading ? <SkeletonLoader /> : null}
      {!loading && !analytics ? <EmptyState title="No analytics" description="Analytics data was unavailable." icon={Activity} /> : null}
      {analytics ? (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Inventory value" value={formatCurrency(analytics.inventoryValue)} icon={Package} />
            <KpiCard label="Low stock items" value={String(analytics.lowStockItems.length)} icon={AlertTriangle} />
            <KpiCard label="Patient confirmation rate" value={`${analytics.patientConfirmationRate}%`} icon={MessageCircle} />
            <KpiCard label="Follow-up conversion" value={`${analytics.followUpConversionRate}%`} icon={TrendingUp} />
            <KpiCard label="Declined follow-ups" value={String(analytics.declinedFollowUps)} icon={AlertTriangle} />
            <KpiCard label="Pending confirmations" value={String(analytics.pendingConfirmations)} icon={MessageCircle} />
            <KpiCard label="Total revenue" value={formatCurrency(analytics.totalRevenue)} icon={IndianRupee} />
            <KpiCard label="Total patients" value={String(analytics.totalPatients)} icon={Users} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartPanel title="Monthly patient flow">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={objectToChart(analytics.monthlyPatientFlow, "patients")}>
                  <CartesianGrid strokeDasharray="3 3" {...chartGridProps} />
                  <XAxis dataKey="name" {...chartAxisProps} />
                  <YAxis allowDecimals={false} {...chartAxisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Line dataKey="patients" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Monthly revenue">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={objectToChart(analytics.monthlyRevenue, "revenue")}>
                  <CartesianGrid strokeDasharray="3 3" {...chartGridProps} />
                  <XAxis dataKey="name" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Bar dataKey="revenue" fill="#059669" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Appointment status summary">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Today", value: analytics.todayAppointments },
                    { name: "Upcoming FU", value: analytics.upcomingFollowUps },
                    { name: "Pending", value: analytics.pendingConfirmations },
                    { name: "Confirmed FU", value: analytics.confirmedFollowUps },
                    { name: "Declined FU", value: analytics.declinedFollowUps }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" {...chartGridProps} />
                  <XAxis dataKey="name" {...chartAxisProps} />
                  <YAxis allowDecimals={false} {...chartAxisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Treatment-wise follow-up count">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={objectToChart(analytics.treatmentWiseFollowUps, "followUps")}>
                  <CartesianGrid strokeDasharray="3 3" {...chartGridProps} />
                  <XAxis dataKey="name" {...chartAxisProps} />
                  <YAxis allowDecimals={false} {...chartAxisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Bar dataKey="followUps" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Doctor-wise confirmed follow-ups">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={objectToChart(analytics.doctorWiseConfirmedFollowUps, "confirmed")}>
                  <CartesianGrid strokeDasharray="3 3" {...chartGridProps} />
                  <XAxis dataKey="name" {...chartAxisProps} />
                  <YAxis allowDecimals={false} {...chartAxisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Bar dataKey="confirmed" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Treatment-wise confirmation rate">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.treatmentWiseConfirmationRate.map((item) => ({ name: item.treatment, rate: item.rate }))}>
                  <CartesianGrid strokeDasharray="3 3" {...chartGridProps} />
                  <XAxis dataKey="name" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Bar dataKey="rate" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <section className="glass-panel rounded-2xl p-5">
            <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <BarChart3 className="h-5 w-5" />
              Low stock items
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {analytics.lowStockItems.length ? (
                analytics.lowStockItems.map((item) => (
                  <div key={item._id} className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                    <p className="font-semibold">{item.itemName}</p>
                    <p>{item.quantity} left · threshold {item.lowStockThreshold}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No low stock items" description="Inventory levels look healthy." icon={Package} />
              )}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
