"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange
}: {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="border-b border-slate-200/70 bg-slate-50/80 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className={`px-4 py-3 font-semibold ${column.className || ""}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
            {data.map((row, index) => (
              <tr key={index} className="bg-white/45 transition hover:bg-white/80 dark:bg-transparent dark:hover:bg-white/5">
                {columns.map((column) => (
                  <td key={column.header} className={`px-4 py-4 align-middle ${column.className || ""}`}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200/70 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" className="h-9 px-3" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="h-9 px-3"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
