"use client";

import type { Prescription } from "@/types";

const value = (input?: string) => input || "-";

export function PrescriptionPrintView({ prescription }: { prescription: Prescription }) {
  return (
    <article className="prescription-print rounded-2xl bg-white p-6 text-slate-950 shadow-soft">
      <header className="border-b border-slate-200 pb-4 text-center">
        <h1 className="text-xl font-bold uppercase">PARAMS DENTAL MULTI SPECIALITY CLINIC AND ORTHODONTIC CENTRE</h1>
        <p className="mt-2 text-sm">#1175, 1st A Main Road, Vijayanagar, Bengaluru, Karnataka - 560040</p>
        <p className="text-sm">Phone: +91 99025 35254</p>
        <p className="text-sm">Website: https://www.paramsdental.in</p>
      </header>

      <section className="grid gap-3 border-b border-slate-200 py-4 text-sm md:grid-cols-2">
        <div>
          <p><span className="font-semibold">Prescription No:</span> {prescription.prescriptionNo}</p>
          <p><span className="font-semibold">Date:</span> {prescription.date}</p>
        </div>
        <div className="md:text-right">
          <p><span className="font-semibold">Doctor:</span> Dr. {prescription.doctorName}</p>
          <p><span className="font-semibold">Qualification:</span> {value(prescription.doctorQualification)}</p>
          <p><span className="font-semibold">Reg No:</span> {value(prescription.doctorRegistrationNo)}</p>
        </div>
      </section>

      <section className="grid gap-3 border-b border-slate-200 py-4 text-sm md:grid-cols-2">
        <div>
          <h2 className="font-bold">Patient Details</h2>
          <p>{prescription.patientName}</p>
          <p>Phone: {value(prescription.patientPhone)}</p>
        </div>
        <div>
          <p>Age: {value(prescription.patientAge)}</p>
          <p>Gender: {value(prescription.patientGender)}</p>
          <p>Follow-up Date: {value(prescription.followUpDate)}</p>
        </div>
      </section>

      <section className="grid gap-3 py-4 text-sm">
        <div>
          <h2 className="font-bold">Chief Complaint</h2>
          <p>{value(prescription.chiefComplaint)}</p>
        </div>
        <div>
          <h2 className="font-bold">Diagnosis</h2>
          <p>{value(prescription.diagnosis)}</p>
        </div>
        <div>
          <h2 className="font-bold">Treatment Notes</h2>
          <p>{value(prescription.treatmentNotes)}</p>
        </div>
      </section>

      <section className="py-4">
        <h2 className="text-lg font-bold">Rx</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="py-2 pr-2">Medicine</th>
                <th className="py-2 pr-2">Strength</th>
                <th className="py-2 pr-2">Form</th>
                <th className="py-2 pr-2">Dose</th>
                <th className="py-2 pr-2">Frequency</th>
                <th className="py-2 pr-2">Duration</th>
                <th className="py-2 pr-2">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {prescription.medicines.map((medicine, index) => (
                <tr key={`${medicine.medicineName}-${index}`} className="border-b border-slate-200">
                  <td className="py-2 pr-2 font-semibold">{medicine.medicineName}</td>
                  <td className="py-2 pr-2">{value(medicine.strength)}</td>
                  <td className="py-2 pr-2">{value(medicine.dosageForm)}</td>
                  <td className="py-2 pr-2">{value(medicine.dose)}</td>
                  <td className="py-2 pr-2">{value(medicine.frequency)}</td>
                  <td className="py-2 pr-2">{value(medicine.duration)}</td>
                  <td className="py-2 pr-2">{value(medicine.instructions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 border-t border-slate-200 py-4 text-sm">
        <div>
          <h2 className="font-bold">Special Instructions</h2>
          <p>{value(prescription.specialInstructions)}</p>
        </div>
      </section>

      <footer className="mt-12 flex justify-end">
        <div className="w-56 border-t border-slate-400 pt-2 text-center text-sm font-semibold">
          Doctor signature / stamp
        </div>
      </footer>
    </article>
  );
}
