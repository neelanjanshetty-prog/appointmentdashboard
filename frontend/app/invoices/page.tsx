"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Download, Eye, FileText, MessageCircle, Plus, Printer, ReceiptText, Trash2, UserPen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { FormInput } from "@/components/FormInput";
import { IconButton } from "@/components/IconButton";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { SelectInput } from "@/components/SelectInput";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { TextArea } from "@/components/TextArea";
import { useToast } from "@/components/ToastProvider";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse, Invoice, Patient } from "@/types";

const pageSize = 8;
const paymentModes = ["Cash", "UPI", "Card", "Insurance", "Bank Transfer"];

const blankInvoice = {
  patientId: "",
  patientName: "",
  patientPhone: "",
  services: [{ name: "", price: 0 }],
  discount: 0,
  amountPaid: 0,
  previousBalance: 0,
  paymentMode: "Cash",
  notes: ""
};

const blankPayment = {
  amount: 0,
  paymentMode: "Cash",
  paymentDate: new Date().toISOString().split("T")[0],
  note: ""
};

type InvoiceFormValue = typeof blankInvoice;
type PaymentFormValue = typeof blankPayment;

const calculateSubtotal = (services: InvoiceFormValue["services"]) => services.reduce((sum, service) => sum + Number(service.price || 0), 0);
const getInvoicePatientId = (invoice: Invoice) => (typeof invoice.patientId === "object" ? invoice.patientId._id : invoice.patientId || "");
const getInvoiceTotal = (invoice: Invoice) => Number(invoice.totalAmount ?? invoice.total ?? 0);
const getInvoicePaid = (invoice: Invoice) => Number(invoice.totalPaid ?? invoice.amountPaid ?? 0);
const getInvoiceBalance = (invoice: Invoice) => Number(invoice.balanceDue ?? Math.max(getInvoiceTotal(invoice) - getInvoicePaid(invoice), 0));
const getServiceName = (service: Invoice["services"][number]) => service.service || service.name || "-";
const getStatus = (balance: number, paid: number) => balance <= 0 ? "Paid" : paid > 0 ? "Partially Paid" : "Unpaid";

function StatusBadge({ status }: { status: string }) {
  const tone = status === "Paid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-white"
    : status === "Partially Paid"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-white"
      : "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-white";

  return <Badge className={tone}>{status}</Badge>;
}

function InvoiceForm({
  initialValue,
  patients,
  loading,
  onSubmit
}: {
  initialValue: InvoiceFormValue;
  patients: Patient[];
  loading: boolean;
  onSubmit: (value: InvoiceFormValue) => void;
}) {
  const [form, setForm] = useState(initialValue);
  const [previousBalance, setPreviousBalance] = useState(Number(initialValue.previousBalance || 0));
  const patientListId = `invoice-patient-options-${useId().replace(/:/g, "")}`;
  const subtotal = calculateSubtotal(form.services);
  const total = Math.max(subtotal - Number(form.discount || 0), 0);
  const amountPaid = Number(form.amountPaid || 0);
  const balanceLeft = Math.max(total + previousBalance - amountPaid, 0);
  const status = getStatus(balanceLeft, amountPaid);

  useEffect(() => {
    setForm(initialValue);
    setPreviousBalance(Number(initialValue.previousBalance || 0));
  }, [initialValue]);

  const loadPatientBalance = async (patientId: string) => {
    if (!patientId) {
      setPreviousBalance(0);
      return;
    }

    try {
      const response = await api.get<ApiResponse<{ outstandingBalance: number }>>(`/api/invoices/patient/${patientId}/balance`);
      setPreviousBalance(Number(response.data.data.outstandingBalance || 0));
    } catch {
      setPreviousBalance(0);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
  };

  const applyPatient = (patient?: Patient, patientName = form.patientName) => {
    setForm({
      ...form,
      patientId: patient?._id || "",
      patientName: patient?.name || patientName,
      patientPhone: patient?.phone || form.patientPhone
    });
    loadPatientBalance(patient?._id || "");
  };

  const updatePatientName = (patientName: string) => {
    const normalizedName = patientName.trim().toLowerCase();
    const patient = patients.find((item) => item.name.trim().toLowerCase() === normalizedName);
    applyPatient(patient, patientName);
  };

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <datalist id={patientListId}>
        {patients.map((patient) => (
          <option key={patient._id} value={patient.name} label={patient.phone} />
        ))}
      </datalist>

      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Patient name" list={patientListId} placeholder="Start typing to search patients" value={form.patientName} onChange={(event) => updatePatientName(event.target.value)} required />
        <FormInput label="Patient phone" value={form.patientPhone} onChange={(event) => setForm({ ...form, patientPhone: event.target.value })} required />
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Services</p>
          <Button type="button" variant="secondary" className="h-9" onClick={() => setForm({ ...form, services: [...form.services, { name: "", price: 0 }] })}>
            <Plus className="h-4 w-4" />
            Service
          </Button>
        </div>
        {form.services.map((service, index) => (
          <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5 md:grid-cols-[1fr_160px_44px]">
            <FormInput
              label="Service"
              value={service.name}
              onChange={(event) => {
                const services = [...form.services];
                services[index] = { ...service, name: event.target.value };
                setForm({ ...form, services });
              }}
              required
            />
            <FormInput
              label="Price"
              type="number"
              min="0"
              value={service.price}
              onChange={(event) => {
                const services = [...form.services];
                services[index] = { ...service, price: Number(event.target.value) };
                setForm({ ...form, services });
              }}
              required
            />
            <IconButton
              type="button"
              tone="danger"
              className="mt-7 h-11 w-11"
              onClick={() => {
                const services = form.services.filter((_, serviceIndex) => serviceIndex !== index);
                setForm({ ...form, services: services.length ? services : [{ name: "", price: 0 }] });
              }}
              aria-label="Remove service"
              title="Remove service"
            >
              <Trash2 className="h-5 w-5" />
            </IconButton>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Discount" type="number" min="0" value={form.discount} onChange={(event) => setForm({ ...form, discount: Number(event.target.value) })} />
        <SelectInput label="Payment mode" value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value })}>
          {paymentModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
        </SelectInput>
        <FormInput label="Amount paid now" type="number" min="0" max={total + previousBalance} value={form.amountPaid} onChange={(event) => setForm({ ...form, amountPaid: Number(event.target.value) })} />
        <FormInput label="Balance left" value={formatCurrency(balanceLeft)} readOnly />
      </div>

      <TextArea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />

      <div className="grid gap-2 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-400/10 dark:text-white">
        <div className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
        <div className="flex justify-between"><span>Discount</span><strong>{formatCurrency(Number(form.discount || 0))}</strong></div>
        <div className="flex justify-between"><span>Total amount</span><strong>{formatCurrency(total)}</strong></div>
        <div className="flex justify-between"><span>Previous balance</span><strong>{formatCurrency(previousBalance)}</strong></div>
        <div className="flex justify-between"><span>Paid now</span><strong>{formatCurrency(amountPaid)}</strong></div>
        <div className="flex justify-between text-base"><span>Balance due</span><strong>{formatCurrency(balanceLeft)}</strong></div>
        <div className="flex justify-between"><span>Status</span><strong>{status}</strong></div>
      </div>

      <Button type="submit" loading={loading}>Save invoice</Button>
    </form>
  );
}

function PaymentForm({ loading, maxAmount, onSubmit }: { loading: boolean; maxAmount?: number; onSubmit: (value: PaymentFormValue) => void }) {
  const [form, setForm] = useState(blankPayment);
  const safeMax = Number(maxAmount || 0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {safeMax ? (
        <div className="rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-900 dark:bg-blue-400/10 dark:text-white">
          Balance due: {formatCurrency(safeMax)}
        </div>
      ) : null}
      <FormInput label="Amount" type="number" min="1" max={safeMax || undefined} value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} required />
      <SelectInput label="Payment mode" value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value })}>
        {paymentModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
      </SelectInput>
      <FormInput label="Payment date" type="date" value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} required />
      <TextArea label="Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
      <Button type="submit" loading={loading}>Save payment</Button>
    </form>
  );
}

function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  const total = getInvoiceTotal(invoice);
  const paid = getInvoicePaid(invoice);
  const balance = getInvoiceBalance(invoice);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/10 md:grid-cols-3">
        <div><p className="text-slate-500 dark:text-slate-200">Invoice No</p><p className="font-semibold text-slate-950 dark:text-white">{invoice.invoiceNo || invoice._id}</p></div>
        <div><p className="text-slate-500 dark:text-slate-200">Patient</p><p className="font-semibold text-slate-950 dark:text-white">{invoice.patientName}</p></div>
        <div><p className="text-slate-500 dark:text-slate-200">Status</p><StatusBadge status={invoice.paymentStatus || getStatus(balance, paid)} /></div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-sm text-slate-500 dark:text-slate-200">Total</p><p className="text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(total)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-sm text-slate-500 dark:text-slate-200">Paid</p><p className="text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(paid)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-sm text-slate-500 dark:text-slate-200">Balance</p><p className="text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(balance)}</p></div>
      </div>

      <section className="grid gap-2">
        <h3 className="font-semibold text-slate-950 dark:text-white">Services</h3>
        {invoice.services.map((service, index) => (
          <div key={`${getServiceName(service)}-${index}`} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/10">
            <span>{getServiceName(service)}</span>
            <strong>{formatCurrency(service.price)}</strong>
          </div>
        ))}
      </section>

      <section className="grid gap-2">
        <h3 className="font-semibold text-slate-950 dark:text-white">Payment history</h3>
        {invoice.payments?.length ? invoice.payments.map((payment, index) => (
          <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/10 md:grid-cols-4">
            <span>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("en-IN") : "-"}</span>
            <span>{payment.paymentMode || "-"}</span>
            <strong>{formatCurrency(payment.amount)}</strong>
            <span>{payment.note || "-"}</span>
          </div>
        )) : <p className="text-sm text-slate-500 dark:text-slate-200">No installments recorded yet.</p>}
      </section>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [recording, setRecording] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoiceResponse, patientResponse] = await Promise.all([
        api.get<ApiResponse<Invoice[]>>("/api/invoices"),
        api.get<ApiResponse<Patient[]>>("/api/patients")
      ]);
      setInvoices(invoiceResponse.data.data);
      setPatients(patientResponse.data.data);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not load invoices."), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const paginated = useMemo(() => invoices.slice((page - 1) * pageSize, page * pageSize), [invoices, page]);

  const refreshInvoice = async (id: string) => {
    const response = await api.get<ApiResponse<Invoice>>(`/api/invoices/${id}`);
    const fresh = response.data.data;
    setInvoices((current) => current.map((invoice) => invoice._id === id ? fresh : invoice));
    setViewing((current) => current?._id === id ? fresh : current);
    setRecording((current) => current?._id === id ? fresh : current);
    return fresh;
  };

  const saveInvoice = async (value: InvoiceFormValue, invoice?: Invoice) => {
    setSaving(true);
    try {
      const payload = { ...value, patientId: value.patientId || undefined };
      if (invoice) await api.put(`/api/invoices/${invoice._id}`, payload);
      else await api.post("/api/invoices", payload);
      showToast("Invoice saved", "success");
      setAddOpen(false);
      setEditing(null);
      await loadData();
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not save invoice."), "error");
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (value: PaymentFormValue) => {
    if (!recording) return;
    setSaving(true);
    try {
      await api.post(`/api/invoices/${recording._id}/payments`, value);
      showToast("Payment recorded.", "success");
      await refreshInvoice(recording._id);
      setRecording(null);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not record payment."), "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteInvoice = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/api/invoices/${deleting._id}`);
      showToast("Invoice deleted.", "success");
      setDeleting(null);
      await loadData();
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not delete invoice."), "error");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (invoice: Invoice) => {
    try {
      const response = await api.get(`/api/invoices/${invoice._id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Params-Dental-Invoice-${invoice.invoiceNo || invoice._id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast("PDF downloaded", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not download invoice PDF."), "error");
    }
  };

  const printInvoice = async (invoice: Invoice) => {
    try {
      const response = await api.get(`/api/invoices/${invoice._id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.src = url;
      document.body.appendChild(frame);
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(frame);
          window.URL.revokeObjectURL(url);
        }, 1000);
      };
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not print invoice."), "error");
    }
  };

  const sendWhatsApp = async (invoice: Invoice) => {
    try {
      await api.post(`/api/invoices/${invoice._id}/send-whatsapp`);
      showToast("Invoice sent on WhatsApp", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not send invoice on WhatsApp."), "error");
    }
  };

  const columns: Array<DataTableColumn<Invoice>> = [
    { header: "Invoice No", cell: (invoice) => invoice.invoiceNo || `INV-${invoice._id.slice(-8).toUpperCase()}` },
    { header: "Patient", cell: (invoice) => <span className="font-semibold text-slate-950 dark:text-white">{invoice.patientName}</span> },
    { header: "Total", cell: (invoice) => formatCurrency(getInvoiceTotal(invoice)) },
    { header: "Paid", cell: (invoice) => formatCurrency(getInvoicePaid(invoice)) },
    { header: "Balance", cell: (invoice) => formatCurrency(getInvoiceBalance(invoice)) },
    { header: "Status", cell: (invoice) => <StatusBadge status={invoice.paymentStatus || getStatus(getInvoiceBalance(invoice), getInvoicePaid(invoice))} /> },
    {
      header: "Actions",
      className: "text-right",
      cell: (invoice) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" className="h-10 px-3" onClick={() => setViewing(invoice)}><Eye className="h-5 w-5" />View</Button>
          <Button variant="secondary" className="h-10 px-3" onClick={() => setRecording(invoice)}><ReceiptText className="h-5 w-5" />Record Payment</Button>
          <Button variant="secondary" className="h-10 px-3" onClick={() => downloadPdf(invoice)}><Download className="h-5 w-5" /></Button>
          <Button variant="secondary" className="h-10 px-3" onClick={() => printInvoice(invoice)}><Printer className="h-5 w-5" /></Button>
          <Button variant="secondary" className="h-10 px-3" onClick={() => sendWhatsApp(invoice)}><MessageCircle className="h-5 w-5" /></Button>
          <IconButton onClick={() => setEditing(invoice)} aria-label="Edit invoice" title="Edit invoice"><UserPen className="h-5 w-5" /></IconButton>
          <IconButton tone="danger" onClick={() => setDeleting(invoice)} aria-label="Delete invoice" title="Delete invoice"><Trash2 className="h-5 w-5" /></IconButton>
        </div>
      )
    }
  ];

  return (
    <AppShell title="Invoices">
      <PageHeader title="Invoices" description="Create itemized invoices, record installments, and track patient balances." badge="Billing" action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Create invoice</Button>} />
      {loading ? <SkeletonLoader /> : paginated.length ? <DataTable columns={columns} data={paginated} page={page} pageSize={pageSize} total={invoices.length} onPageChange={setPage} /> : <EmptyState title="No invoices" description="Create the first patient invoice." icon={FileText} />}

      <Modal open={addOpen} title="Create invoice" onClose={() => setAddOpen(false)} maxWidth="max-w-4xl">
        <InvoiceForm initialValue={blankInvoice} patients={patients} loading={saving} onSubmit={(value) => saveInvoice(value)} />
      </Modal>
      <Modal open={Boolean(editing)} title="Edit invoice" onClose={() => setEditing(null)} maxWidth="max-w-4xl">
        {editing ? (
          <InvoiceForm
            initialValue={{
              patientId: getInvoicePatientId(editing),
              patientName: editing.patientName,
              patientPhone: editing.patientPhone,
              services: editing.services.length ? editing.services.map((service) => ({ name: getServiceName(service), price: service.price })) : [{ name: "", price: 0 }],
              discount: editing.discount,
              amountPaid: editing.amountPaid || 0,
              previousBalance: editing.previousBalance || 0,
              paymentMode: editing.paymentMode || "Cash",
              notes: editing.notes || ""
            }}
            patients={patients}
            loading={saving}
            onSubmit={(value) => saveInvoice(value, editing)}
          />
        ) : null}
      </Modal>
      <Modal open={Boolean(viewing)} title="Invoice details" onClose={() => setViewing(null)} maxWidth="max-w-5xl">
        {viewing ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setRecording(viewing)}><ReceiptText className="h-4 w-4" />Record Payment</Button>
              <Button variant="secondary" onClick={() => downloadPdf(viewing)}><Download className="h-4 w-4" />Download PDF</Button>
              <Button variant="secondary" onClick={() => printInvoice(viewing)}><Printer className="h-4 w-4" />Print Invoice</Button>
            </div>
            <InvoiceDetails invoice={viewing} />
          </div>
        ) : null}
      </Modal>
      <Modal open={Boolean(recording)} title="Record payment" onClose={() => setRecording(null)} maxWidth="max-w-xl">
        <PaymentForm loading={saving} maxAmount={recording ? getInvoiceBalance(recording) : 0} onSubmit={recordPayment} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete invoice" description="Delete this invoice?" loading={saving} onClose={() => setDeleting(null)} onConfirm={deleteInvoice} />
    </AppShell>
  );
}
