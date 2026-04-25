"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

export function ConfirmDialog({
  open,
  title,
  description,
  loading,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="flex gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-700" loading={loading} onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
