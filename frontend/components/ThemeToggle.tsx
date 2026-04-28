"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("appointmentdashboard_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;

    setDark(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("appointmentdashboard_theme", nextDark ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      className="h-12 w-12 rounded-2xl bg-white px-0 text-slate-900 shadow-lg hover:bg-slate-100 hover:text-slate-950 dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
    </Button>
  );
}
