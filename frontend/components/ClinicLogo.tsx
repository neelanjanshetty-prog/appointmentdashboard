"use client";

import { cn } from "@/lib/utils";

export function ClinicLogo({ className }: { className?: string }) {
  return (
    <img
      src="/clinic-logo.jpg"
      alt="Param's Dental"
      className={cn("h-full w-full object-contain", className)}
    />
  );
}
