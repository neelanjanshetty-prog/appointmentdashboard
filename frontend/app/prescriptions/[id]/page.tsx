"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FilePenLine, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { PrescriptionPrintView } from "@/app/prescriptions/PrescriptionPrintView";
import { prescriptionApi } from "@/lib/prescriptions";
import type { Prescription } from "@/types";

export default function PrescriptionViewPage() {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  useEffect(() => {
    const loadPrescription = async () => {
      setLoading(true);
      try {
        const response = await prescriptionApi.get(params.id);
        setPrescription(response.data.data);
      } catch {
        showToast("Could not load prescription.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadPrescription();
  }, [params.id]);

  return (
    <AppShell title="Prescription">
      <PageHeader
        title="Prescription"
        description="Review and print the patient prescription."
        badge="Rx"
        action={
          <div className="flex gap-2 print-hidden">
            {prescription ? (
              <Link href={`/prescriptions/${prescription._id}/edit`}>
                <Button variant="secondary">
                  <FilePenLine className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            ) : null}
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        }
      />

      {loading ? <SkeletonLoader /> : null}
      {!loading && !prescription ? <EmptyState title="Prescription not found" description="The requested prescription could not be loaded." icon={Printer} /> : null}
      {prescription ? <PrescriptionPrintView prescription={prescription} /> : null}

      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          header,
          aside,
          .print-hidden,
          .fixed.right-4.top-4 {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }

          .prescription-print {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 20px !important;
            color: #0f172a !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
