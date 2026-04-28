"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { PrescriptionForm } from "@/app/prescriptions/PrescriptionForm";
import { api, getApiErrorMessage } from "@/lib/api";
import { prescriptionApi, type PrescriptionPayload } from "@/lib/prescriptions";
import type { ApiResponse, Appointment, Doctor, InventoryItem, Patient } from "@/types";

function NewPrescriptionContent() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedAppointmentId = searchParams.get("appointmentId") || undefined;
  const { showToast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [patientResponse, doctorResponse, appointmentResponse, inventoryResponse] = await Promise.all([
          api.get<ApiResponse<Patient[]>>("/api/patients"),
          api.get<ApiResponse<Doctor[]>>("/api/doctors"),
          api.get<ApiResponse<Appointment[]>>("/api/appointments"),
          api.get<ApiResponse<InventoryItem[]>>("/api/inventory")
        ]);

        setPatients(patientResponse.data.data);
        setDoctors(doctorResponse.data.data);
        setAppointments(appointmentResponse.data.data);
        setInventoryItems(inventoryResponse.data.data);
      } catch (error) {
        showToast(getApiErrorMessage(error, "Could not load prescription form data."), "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const savePrescription = async (payload: PrescriptionPayload) => {
    setSaving(true);
    try {
      const response = await prescriptionApi.create(payload);
      showToast("Prescription created.", "success");
      router.push(`/prescriptions/${response.data.data._id}`);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not create prescription."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Create Prescription">
      <PageHeader title="Create prescription" description="Prepare a digital Rx with diagnosis, treatment notes, medicines, and follow-up instructions." badge="Rx" />
      <section className="glass-panel rounded-2xl p-5">
        {loading ? <SkeletonLoader /> : (
          <PrescriptionForm
            patients={patients}
            doctors={doctors}
            appointments={appointments}
            inventoryItems={inventoryItems}
            selectedAppointmentId={selectedAppointmentId}
            loading={saving}
            onSubmit={savePrescription}
          />
        )}
      </section>
    </AppShell>
  );
}

export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={<AppShell title="Create Prescription"><SkeletonLoader /></AppShell>}>
      <NewPrescriptionContent />
    </Suspense>
  );
}
