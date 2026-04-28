"use client";

import { api } from "@/lib/api";
import type { ApiResponse, Prescription } from "@/types";

export type PrescriptionPayload = {
  prescriptionNo?: string;
  date?: string;
  patientId: string;
  appointmentId?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  patientPhone?: string;
  doctorId: string;
  doctorName?: string;
  doctorQualification?: string;
  doctorRegistrationNo?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentNotes?: string;
  medicines: Array<{
    medicineName: string;
    strength?: string;
    dosageForm?: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
  specialInstructions?: string;
  followUpDate?: string;
};

export const prescriptionApi = {
  list: () => api.get<ApiResponse<Prescription[]>>("/api/prescriptions"),
  get: (id: string) => api.get<ApiResponse<Prescription>>(`/api/prescriptions/${id}`),
  create: (payload: PrescriptionPayload) => api.post<ApiResponse<Prescription>>("/api/prescriptions", payload),
  update: (id: string, payload: PrescriptionPayload) => api.put<ApiResponse<Prescription>>(`/api/prescriptions/${id}`, payload),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/api/prescriptions/${id}`),
  byPatient: (patientId: string) => api.get<ApiResponse<Prescription[]>>(`/api/prescriptions/patient/${patientId}`),
  byAppointment: (appointmentId: string) => api.get<ApiResponse<Prescription[]>>(`/api/prescriptions/appointment/${appointmentId}`)
};
