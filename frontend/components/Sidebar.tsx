"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Pill,
  Package,
  Settings,
  Stethoscope,
  Users
} from "lucide-react";
import { ClinicLogo } from "@/components/ClinicLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Doctors", href: "/doctors", icon: Stethoscope },
  { label: "Appointments", href: "/appointments", icon: ClipboardList },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Digital Prescription", href: "/prescriptions", icon: Pill },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Analytics", href: "/analytics", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 shrink-0 p-4 lg:block">
      <div className="glass-panel flex h-full flex-col rounded-2xl p-4">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1.5 shadow-lg shadow-blue-600/20">
            <ClinicLogo />
          </div>
          <div>
            <p className="font-bold text-slate-950 dark:text-white">Params Dental</p>
            <p className="text-xs text-slate-500 dark:text-slate-200">Clinic OS</p>
          </div>
        </Link>

        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
