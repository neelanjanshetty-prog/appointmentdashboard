"use client";

import { LogOut, Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { clearToken } from "@/lib/auth";

export function Topbar({ title }: { title: string }) {
  const router = useRouter();

  const signOut = () => {
    clearToken();
    router.replace("/signin");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconButton className="lg:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </IconButton>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-white">
              Clinic workspace
            </p>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">{title}</h1>
          </div>
        </div>

        <div className="hidden min-w-64 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 md:flex">
          <Search className="h-4 w-4" />
          <span>Search patients, doctors, invoices</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="secondary" className="h-11 px-3" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
