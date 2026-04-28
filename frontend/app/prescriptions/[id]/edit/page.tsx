"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { PrescriptionForm } from "@/app/prescriptions/PrescriptionForm";
import { api, getApiErrorMessage } from "@/lib/api";
import { prescriptionApi, type PrescriptionPayload } from "@/lib/prescriptions";
import type { ApiResponse, Appointment, Doctor, InventoryItem, Patient, Prescription } from "@/types";

export default function EditPrescriptionPage() {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [prescriptionResponse, patientResponse, doctorResponse, appointmentResponse, inventoryResponse] = await Promise.all([
          prescriptionApi.get(params.id),
          api.get<ApiResponse<Patient[]>>("/api/patients"),
          api.get<ApiResponse<Doctor[]>>("/api/doctors"),
          api.get<ApiResponse<Appointment[]>>("/api/appointments"),
          api.get<ApiResponse<InventoryItem[]>>("/api/inventory")
        ]);

        setPrescription(prescriptionResponse.data.data);
        setPatients(patientResponse.data.data);
        setDoctors(doctorResponse.data.data);
        setAppointments(appointmentResponse.data.data);
        setInventoryItems(inventoryResponse.data.data);
      } catch (error) {
        showToast(getApiErrorMessage(error, "Could not load prescription."), "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params.id]);

  const updatePrescription = async (payload: PrescriptionPayload) => {
    setSaving(true);
    try {
      const response = await prescriptionApi.update(params.id, payload);
      showToast("Prescription updated.", "success");
      router.push(`/prescriptions/${response.data.data._id}`);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not update prescription."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Edit Prescription">
      <PageHeader title="Edit prescription" description="Update prescription details, medicine schedule, and follow-up instructions." badge="Rx" />
      <section className="glass-panel rounded-2xl p-5">
        {loading || !prescription ? <SkeletonLoader /> : (
          <PrescriptionForm
            prescription={prescription}
            patients={patients}
            doctors={doctors}
            appointments={appointments}
            inventoryItems={inventoryItems}
            loading={saving}
            onSubmit={updatePrescription}
          />
        )}
      </section>
    </AppShell>
  );
}
