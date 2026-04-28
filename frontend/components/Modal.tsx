"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/Button";

export function Modal({
  open,
  title,
  children,
  onClose,
  maxWidth = "max-w-lg"
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            className={`glass-panel max-h-[90vh] w-full overflow-y-auto rounded-2xl p-5 ${maxWidth}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
              <Button
                variant="ghost"
                className="h-12 w-12 rounded-2xl bg-white px-0 text-slate-900 shadow-lg hover:bg-slate-100 hover:text-slate-950 dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
