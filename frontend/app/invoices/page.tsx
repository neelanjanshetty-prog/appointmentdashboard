"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, FileText, MessageCircle, Plus, Trash2, UserPen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { FormInput } from "@/components/FormInput";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { SelectInput } from "@/components/SelectInput";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse, Invoice, Patient } from "@/types";

const pageSize = 8;
const blankInvoice = {
  patientId: "",
  patientName: "",
  patientPhone: "",
  services: [{ name: "", price: 0 }],
  discount: 0,
  paymentMode: "Cash"
};

type InvoiceFormValue = typeof blankInvoice;

const calculateSubtotal = (services: InvoiceFormValue["services"]) => services.reduce((sum, service) => sum + Number(service.price || 0), 0);

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
  const subtotal = calculateSubtotal(form.services);
  const total = Math.max(subtotal - Number(form.discount || 0), 0);

  useEffect(() => {
    setForm(initialValue);
  }, [initialValue]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
  };

  const selectPatient = (patientId: string) => {
    const patient = patients.find((item) => item._id === patientId);
    setForm({
      ...form,
      patientId,
      patientName: patient?.name || form.patientName,
      patientPhone: patient?.phone || form.patientPhone
    });
  };

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <SelectInput label="Patient selection (optional)" value={form.patientId} onChange={(event) => selectPatient(event.target.value)}>
        <option value="">Manual patient</option>
        {patients.map((patient) => (
          <option key={patient._id} value={patient._id}>
            {patient.name}
          </option>
        ))}
      </SelectInput>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Patient name" value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} required />
        <FormInput label="Patient phone" value={form.patientPhone} onChange={(event) => setForm({ ...form, patientPhone: event.target.value })} required />
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Services</p>
          <Button
            type="button"
            variant="secondary"
            className="h-9"
            onClick={() => setForm({ ...form, services: [...form.services, { name: "", price: 0 }] })}
          >
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
            <Button
              type="button"
              variant="ghost"
              className="mt-7 h-11 w-11 px-0 text-rose-600"
              onClick={() => setForm({ ...form, services: form.services.filter((_, serviceIndex) => serviceIndex !== index) || [{ name: "", price: 0 }] })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Discount" type="number" min="0" value={form.discount} onChange={(event) => setForm({ ...form, discount: Number(event.target.value) })} />
        <SelectInput label="Payment mode" value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value })}>
          {["Cash", "UPI", "Card", "Insurance"].map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </SelectInput>
      </div>
      <div className="grid gap-2 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-400/10 dark:text-blue-200">
        <div className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
        <div className="flex justify-between"><span>Discount</span><strong>{formatCurrency(Number(form.discount || 0))}</strong></div>
        <div className="flex justify-between text-base"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
      </div>
      <Button type="submit" loading={loading}>
        Save invoice
      </Button>
    </form>
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
    } catch {
      showToast("Could not load invoices.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const paginated = useMemo(() => invoices.slice((page - 1) * pageSize, page * pageSize), [invoices, page]);

  const saveInvoice = async (value: InvoiceFormValue, invoice?: Invoice) => {
    setSaving(true);
    try {
      const payload = { ...value, patientId: value.patientId || undefined };
      if (invoice) {
        await api.put(`/api/invoices/${invoice._id}`, payload);
      } else {
        await api.post("/api/invoices", payload);
      }
      showToast("Invoice saved", "success");
      setAddOpen(false);
      setEditing(null);
      await loadData();
    } catch {
      showToast("Could not save invoice.", "error");
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
    } catch {
      showToast("Could not delete invoice.", "error");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (invoice: Invoice) => {
    const response = await api.get(`/api/invoices/${invoice._id}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${invoice._id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
    showToast("PDF downloaded", "success");
  };

  const sendWhatsApp = async (invoice: Invoice) => {
    await api.post(`/api/invoices/${invoice._id}/send-whatsapp`);
    showToast("Invoice sent on WhatsApp", "success");
  };

  const columns: Array<DataTableColumn<Invoice>> = [
    { header: "Patient", cell: (invoice) => <span className="font-semibold text-slate-950 dark:text-white">{invoice.patientName}</span> },
    { header: "Phone", cell: (invoice) => invoice.patientPhone },
    { header: "Total", cell: (invoice) => formatCurrency(invoice.total) },
    { header: "Payment", cell: (invoice) => invoice.paymentMode || "-" },
    {
      header: "Actions",
      className: "text-right",
      cell: (invoice) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" className="h-9 px-3" onClick={() => downloadPdf(invoice)}><Download className="h-4 w-4" /></Button>
          <Button variant="secondary" className="h-9 px-3" onClick={() => sendWhatsApp(invoice)}><MessageCircle className="h-4 w-4" /></Button>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => setEditing(invoice)}><UserPen className="h-4 w-4" /></Button>
          <Button variant="ghost" className="h-9 w-9 px-0 text-rose-600" onClick={() => setDeleting(invoice)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      )
    }
  ];

  return (
    <AppShell title="Invoices">
      <PageHeader title="Invoices" description="Create itemized invoices, download PDFs, and send billing links on WhatsApp." badge="Billing" action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Create invoice</Button>} />
      {loading ? <SkeletonLoader /> : paginated.length ? <DataTable columns={columns} data={paginated} page={page} pageSize={pageSize} total={invoices.length} onPageChange={setPage} /> : <EmptyState title="No invoices" description="Create the first patient invoice." icon={FileText} />}

      <Modal open={addOpen} title="Create invoice" onClose={() => setAddOpen(false)} maxWidth="max-w-4xl">
        <InvoiceForm initialValue={blankInvoice} patients={patients} loading={saving} onSubmit={(value) => saveInvoice(value)} />
      </Modal>
      <Modal open={Boolean(editing)} title="Edit invoice" onClose={() => setEditing(null)} maxWidth="max-w-4xl">
        {editing ? (
          <InvoiceForm
            initialValue={{
              patientId: "",
              patientName: editing.patientName,
              patientPhone: editing.patientPhone,
              services: editing.services.length ? editing.services : [{ name: "", price: 0 }],
              discount: editing.discount,
              paymentMode: editing.paymentMode || "Cash"
            }}
            patients={patients}
            loading={saving}
            onSubmit={(value) => saveInvoice(value, editing)}
          />
        ) : null}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete invoice" description="Delete this invoice?" loading={saving} onClose={() => setDeleting(null)} onConfirm={deleteInvoice} />
    </AppShell>
  );
}
