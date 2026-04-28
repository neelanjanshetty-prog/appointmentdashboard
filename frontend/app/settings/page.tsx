"use client";

import { Mail, MessageCircle, Settings, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";

function SettingsCard({ title, description, icon: Icon, children }: { title: string; description: string; icon: typeof Settings; children?: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-200">{description}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <PageHeader title="Settings" description="Clinic profile, theme, and integration readiness without exposing private environment secrets." badge="Configuration" />
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsCard title="Clinic details" description="Clinic name, address, operating hours, and brand assets will be configured here." icon={Stethoscope}>
          <Badge>Placeholder</Badge>
        </SettingsCard>
        <SettingsCard title="Theme" description="Switch between light and dark workspace themes." icon={Settings}>
          <ThemeToggle />
        </SettingsCard>
        <SettingsCard title="WhatsApp integration" description="Meta WhatsApp credentials are managed securely in backend environment variables." icon={MessageCircle}>
          <div className="flex flex-wrap gap-2">
            <Badge>Token hidden</Badge>
            <Badge>Phone ID hidden</Badge>
            <Badge>Webhook configured</Badge>
          </div>
        </SettingsCard>
        <SettingsCard title="Email integration" description="SMTP credentials are stored in backend environment variables and never shown in the UI." icon={Mail}>
          <div className="flex flex-wrap gap-2">
            <Badge>Email user hidden</Badge>
            <Badge>Password hidden</Badge>
          </div>
        </SettingsCard>
      </div>
    </AppShell>
  );
}
