"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { IconButton } from "@/components/IconButton";
import { SelectInput } from "@/components/SelectInput";
import { TextArea } from "@/components/TextArea";
import type { Appointment, Doctor, InventoryItem, Patient, Prescription } from "@/types";
import type { PrescriptionPayload } from "@/lib/prescriptions";

const blankMedicine = {
  medicineName: "",
  strength: "",
  dosageForm: "",
  dose: "",
  frequency: "",
  duration: "",
  instructions: ""
};

const blankForm: PrescriptionPayload = {
  date: new Date().toISOString().split("T")[0],
  patientId: "",
  appointmentId: "",
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientPhone: "",
  doctorId: "",
  doctorName: "",
  doctorQualification: "",
  doctorRegistrationNo: "",
  chiefComplaint: "",
  diagnosis: "",
  treatmentNotes: "",
  medicines: [{ ...blankMedicine }],
  specialInstructions: "",
  followUpDate: ""
};

const getPatient = (appointment: Appointment) => (typeof appointment.patientId === "object" ? appointment.patientId : null);
const getDoctor = (appointment: Appointment) => (typeof appointment.doctorId === "object" ? appointment.doctorId : null);

const buildInitialForm = (prescription?: Prescription | null): PrescriptionPayload => {
  if (!prescription) {
    return blankForm;
  }

  return {
    prescriptionNo: prescription.prescriptionNo,
    date: prescription.date,
    patientId: typeof prescription.patientId === "object" ? prescription.patientId._id : prescription.patientId,
    appointmentId:
      typeof prescription.appointmentId === "object"
        ? prescription.appointmentId?._id
        : prescription.appointmentId || "",
    patientName: prescription.patientName,
    patientAge: prescription.patientAge || "",
    patientGender: prescription.patientGender || "",
    patientPhone: prescription.patientPhone || "",
    doctorId: typeof prescription.doctorId === "object" ? prescription.doctorId._id : prescription.doctorId,
    doctorName: prescription.doctorName,
    doctorQualification: prescription.doctorQualification || "",
    doctorRegistrationNo: prescription.doctorRegistrationNo || "",
    chiefComplaint: prescription.chiefComplaint || "",
    diagnosis: prescription.diagnosis || "",
    treatmentNotes: prescription.treatmentNotes || "",
    medicines: prescription.medicines.length ? prescription.medicines : [{ ...blankMedicine }],
    specialInstructions: prescription.specialInstructions || "",
    followUpDate: prescription.followUpDate || ""
  };
};

export function PrescriptionForm({
  prescription,
  patients,
  doctors,
  appointments,
  inventoryItems = [],
  selectedAppointmentId,
  loading,
  onSubmit
}: {
  prescription?: Prescription | null;
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  inventoryItems?: InventoryItem[];
  selectedAppointmentId?: string;
  loading?: boolean;
  onSubmit: (payload: PrescriptionPayload) => void;
}) {
  const [form, setForm] = useState<PrescriptionPayload>(buildInitialForm(prescription));
  const medicineListId = `medicine-options-${useId().replace(/:/g, "")}`;

  const appointmentOptions = useMemo(
    () =>
      appointments.map((appointment) => ({
        appointment,
        patient: getPatient(appointment),
        doctor: getDoctor(appointment)
      })),
    [appointments]
  );

  useEffect(() => {
    setForm(buildInitialForm(prescription));
  }, [prescription]);

  useEffect(() => {
    if (!selectedAppointmentId || prescription) {
      return;
    }

    const match = appointments.find((appointment) => appointment._id === selectedAppointmentId);

    if (!match) {
      return;
    }

    const patient = getPatient(match);
    const doctor = getDoctor(match);

    setForm((current) => ({
      ...current,
      appointmentId: match._id,
      patientId: patient?._id || "",
      patientName: patient?.name || "",
      patientPhone: patient?.phone || "",
      doctorId: doctor?._id || "",
      doctorName: doctor?.name || "",
      doctorQualification: doctor?.specialization || "",
      chiefComplaint: match.reason || current.chiefComplaint || ""
    }));
  }, [appointments, prescription, selectedAppointmentId]);

  const applyPatient = (patientId: string) => {
    const patient = patients.find((item) => item._id === patientId);
    setForm({
      ...form,
      patientId,
      patientName: patient?.name || form.patientName || "",
      patientPhone: patient?.phone || form.patientPhone || ""
    });
  };

  const applyDoctor = (doctorId: string) => {
    const doctor = doctors.find((item) => item._id === doctorId);
    setForm({
      ...form,
      doctorId,
      doctorName: doctor?.name || form.doctorName || "",
      doctorQualification: doctor?.specialization || form.doctorQualification || ""
    });
  };

  const applyAppointment = (appointmentId: string) => {
    const appointment = appointments.find((item) => item._id === appointmentId);
    const patient = appointment ? getPatient(appointment) : null;
    const doctor = appointment ? getDoctor(appointment) : null;

    setForm({
      ...form,
      appointmentId,
      patientId: patient?._id || form.patientId,
      patientName: patient?.name || form.patientName || "",
      patientPhone: patient?.phone || form.patientPhone || "",
      doctorId: doctor?._id || form.doctorId,
      doctorName: doctor?.name || form.doctorName || "",
      doctorQualification: doctor?.specialization || form.doctorQualification || "",
      chiefComplaint: appointment?.reason || form.chiefComplaint || ""
    });
  };

  const setMedicine = (index: number, key: keyof typeof blankMedicine, value: string) => {
    const medicines = [...form.medicines];
    medicines[index] = { ...medicines[index], [key]: value };
    setForm({ ...form, medicines });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      ...form,
      appointmentId: form.appointmentId || undefined,
      followUpDate: form.followUpDate || undefined,
      medicines: form.medicines.filter((medicine) => medicine.medicineName.trim())
    });
  };

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Prescription date" type="date" value={form.date || ""} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
        {prescription?.prescriptionNo ? (
          <FormInput label="Prescription no" value={form.prescriptionNo || ""} onChange={(event) => setForm({ ...form, prescriptionNo: event.target.value })} />
        ) : null}
      </div>

      <SelectInput label="Appointment (optional)" value={form.appointmentId || ""} onChange={(event) => applyAppointment(event.target.value)}>
        <option value="">No linked appointment</option>
        {appointmentOptions.map(({ appointment, patient, doctor }) => (
          <option key={appointment._id} value={appointment._id}>
            {appointment.date} {appointment.time} - {patient?.name || "Patient"} with Dr. {doctor?.name || "Doctor"}
          </option>
        ))}
      </SelectInput>

      <div className="grid gap-4 md:grid-cols-2">
        <SelectInput label="Patient" value={form.patientId} onChange={(event) => applyPatient(event.target.value)} required>
          <option value="">Select patient</option>
          {patients.map((patient) => (
            <option key={patient._id} value={patient._id}>
              {patient.name} - {patient.phone}
            </option>
          ))}
        </SelectInput>
        <SelectInput label="Doctor" value={form.doctorId} onChange={(event) => applyDoctor(event.target.value)} required>
          <option value="">Select doctor</option>
          {doctors.map((doctor) => (
            <option key={doctor._id} value={doctor._id}>
              Dr. {doctor.name}
            </option>
          ))}
        </SelectInput>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Patient age" value={form.patientAge || ""} onChange={(event) => setForm({ ...form, patientAge: event.target.value })} />
        <SelectInput label="Patient gender" value={form.patientGender || ""} onChange={(event) => setForm({ ...form, patientGender: event.target.value })}>
          <option value="">Not specified</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
          <option value="Other">Other</option>
        </SelectInput>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Doctor qualification" value={form.doctorQualification || ""} onChange={(event) => setForm({ ...form, doctorQualification: event.target.value })} />
        <FormInput label="Doctor registration no" value={form.doctorRegistrationNo || ""} onChange={(event) => setForm({ ...form, doctorRegistrationNo: event.target.value })} />
      </div>

      <TextArea label="Chief complaint" value={form.chiefComplaint || ""} onChange={(event) => setForm({ ...form, chiefComplaint: event.target.value })} />
      <TextArea label="Diagnosis" value={form.diagnosis || ""} onChange={(event) => setForm({ ...form, diagnosis: event.target.value })} />
      <TextArea label="Treatment notes" value={form.treatmentNotes || ""} onChange={(event) => setForm({ ...form, treatmentNotes: event.target.value })} />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-950 dark:text-white">Medicines</h3>
          <Button type="button" variant="secondary" className="h-10 px-3" onClick={() => setForm({ ...form, medicines: [...form.medicines, { ...blankMedicine }] })}>
            <Plus className="h-4 w-4" />
            Add Medicine
          </Button>
        </div>

        <datalist id={medicineListId}>
          {inventoryItems.map((item) => (
            <option key={item._id} value={item.itemName} label={`Stock: ${item.quantity}`} />
          ))}
        </datalist>

        {form.medicines.map((medicine, index) => (
          <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="grid gap-3 md:grid-cols-2">
              <FormInput
                label="Medicine name"
                list={medicineListId}
                placeholder="Start typing to search inventory"
                value={medicine.medicineName}
                onChange={(event) => setMedicine(index, "medicineName", event.target.value)}
                required
              />
              <FormInput label="Strength" value={medicine.strength || ""} onChange={(event) => setMedicine(index, "strength", event.target.value)} />
              <FormInput label="Dosage form" value={medicine.dosageForm || ""} onChange={(event) => setMedicine(index, "dosageForm", event.target.value)} />
              <FormInput label="Dose" value={medicine.dose || ""} onChange={(event) => setMedicine(index, "dose", event.target.value)} />
              <FormInput label="Frequency" value={medicine.frequency || ""} onChange={(event) => setMedicine(index, "frequency", event.target.value)} />
              <FormInput label="Duration" value={medicine.duration || ""} onChange={(event) => setMedicine(index, "duration", event.target.value)} />
            </div>
            <TextArea label="Instructions" value={medicine.instructions || ""} onChange={(event) => setMedicine(index, "instructions", event.target.value)} />
            <div className="flex justify-end">
              <IconButton
                type="button"
                tone="danger"
                disabled={form.medicines.length <= 1}
                onClick={() => setForm({ ...form, medicines: form.medicines.filter((_, medicineIndex) => medicineIndex !== index) })}
                aria-label="Remove medicine"
                title="Remove medicine"
              >
                <Trash2 className="h-5 w-5" />
              </IconButton>
            </div>
          </div>
        ))}
      </section>

      <TextArea label="Special instructions" value={form.specialInstructions || ""} onChange={(event) => setForm({ ...form, specialInstructions: event.target.value })} />
      <FormInput label="Follow-up date" type="date" value={form.followUpDate || ""} onChange={(event) => setForm({ ...form, followUpDate: event.target.value })} />

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Save prescription
        </Button>
      </div>
    </form>
  );
}
