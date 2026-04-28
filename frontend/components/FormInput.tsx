"use client";

import { cn } from "@/lib/utils";

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FormInput({ label, className, ...props }: FormInputProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input
        className={cn(
          "h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-white/20 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-400",
          className
        )}
        {...props}
      />
    </label>
  );
}
