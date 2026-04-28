"use client";

import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "neutral" | "danger";
};

export function IconButton({ className, tone = "neutral", children, ...props }: IconButtonProps) {
  const toneClass =
    tone === "danger"
      ? "text-rose-600 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-white/20"
      : "text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:bg-white/20";

  return (
    <Button
      variant="ghost"
      className={cn("h-10 w-10 rounded-xl bg-white px-0 shadow-sm dark:bg-white/10", toneClass, className)}
      {...props}
    >
      {children}
    </Button>
  );
}
