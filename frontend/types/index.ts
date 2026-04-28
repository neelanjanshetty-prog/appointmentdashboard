export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type User = {
  id: string;
  email: string;
};

export type NavItem = {
  label: string;
  href: string;
};

export type Patient = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt?: string;
};

export type Doctor = {
  _id: string;
  name: string;
  specialization: string;
  phone?: string;
  email?: string;
  createdAt?: string;
};

export type AppointmentStatus = "booked" | "pending_confirmation" | "confirmed" | "completed" | "cancelled" | "declined";

export type Appointment = {
  _id: string;
  patientId: string | Patient;
  doctorId: string | Doctor;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  followUpNeeded?: boolean;
  followUpType?: string;
  parentAppointmentId?: string | Partial<Appointment>;
  confirmationStatus?: "none" | "pending" | "confirmed" | "declined";
  createdAt?: string;
};

export type Invoice = {
  _id: string;
  invoiceNo?: string;
  patientId?: string | Patient;
  patientName: string;
  patientPhone: string;
  services: Array<{ name?: string; service?: string; price: number }>;
  discount: number;
  subtotal: number;
  totalAmount?: number;
  amountPaid?: number;
  previousBalance?: number;
  totalPaid?: number;
  balanceDue?: number;
  advancePaid?: number;
  paymentStatus?: "Paid" | "Partially Paid" | "Unpaid";
  total: number;
  paymentMode?: string;
  notes?: string;
  payments?: Array<{
    amount: number;
    paymentMode?: string;
    paymentDate?: string;
    note?: string;
    receivedBy?: string;
  }>;
  pdfPath?: string;
  createdAt?: string;
};

export type InventoryItem = {
  _id: string;
  itemName: string;
  quantity: number;
  price: number;
  supplier?: string;
  lowStockThreshold: number;
  createdAt?: string;
};

export type PrescriptionMedicine = {
  medicineName: string;
  strength?: string;
  dosageForm?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

export type Prescription = {
  _id: string;
  prescriptionNo: string;
  date: string;
  patientId: string | Patient;
  appointmentId?: string | Partial<Appointment>;
  patientName: string;
  patientAge?: string;
  patientGender?: string;
  patientPhone?: string;
  doctorId: string | Doctor;
  doctorName: string;
  doctorQualification?: string;
  doctorRegistrationNo?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentNotes?: string;
  medicines: PrescriptionMedicine[];
  specialInstructions?: string;
  followUpDate?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AnalyticsOverview = {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  todayAppointments: number;
  upcomingFollowUps: number;
  pendingConfirmations: number;
  confirmedFollowUps: number;
  declinedFollowUps: number;
  missedFollowUps: number;
  patientConfirmationRate: number;
  followUpConversionRate: number;
  monthlyPatientFlow: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  treatmentWiseFollowUps: Record<string, number>;
  treatmentWiseConfirmationRate: Array<{
    treatment: string;
    total: number;
    confirmed: number;
    rate: number;
  }>;
  doctorWiseConfirmedFollowUps: Record<string, number>;
  inventoryValue: number;
  lowStockItems: InventoryItem[];
};

export type PatientTimeline = {
  patient: Patient;
  appointments: Appointment[];
  invoices: Invoice[];
};
