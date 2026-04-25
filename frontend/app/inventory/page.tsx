"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package, Plus, Search, Trash2, UserPen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { FormInput } from "@/components/FormInput";
import { KpiCard } from "@/components/KpiCard";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { SelectInput } from "@/components/SelectInput";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useToast } from "@/components/ToastProvider";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse, InventoryItem } from "@/types";

const pageSize = 8;
const blankItem = { itemName: "", quantity: 0, price: 0, supplier: "", lowStockThreshold: 0 };

function InventoryForm({
  initialValue,
  loading,
  onSubmit
}: {
  initialValue: typeof blankItem;
  loading: boolean;
  onSubmit: (value: typeof blankItem) => void;
}) {
  const [form, setForm] = useState(initialValue);

  useEffect(() => setForm(initialValue), [initialValue]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormInput label="Item name" value={form.itemName} onChange={(event) => setForm({ ...form, itemName: event.target.value })} required />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput label="Quantity" type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} required />
        <FormInput label="Price" type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} required />
      </div>
      <FormInput label="Supplier" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} />
      <FormInput label="Low stock threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: Number(event.target.value) })} />
      <Button type="submit" loading={loading}>Save item</Button>
    </form>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const { showToast } = useToast();

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiResponse<InventoryItem[]>>("/api/inventory");
      setItems(response.data.data);
    } catch {
      showToast("Could not load inventory.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const suppliers = useMemo(() => Array.from(new Set(items.map((item) => item.supplier).filter(Boolean))) as string[], [items]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((item) => {
      const matchesSearch = [item.itemName, item.supplier].some((value) => value?.toLowerCase().includes(q));
      const matchesSupplier = supplier ? item.supplier === supplier : true;
      return matchesSearch && matchesSupplier;
    });
  }, [items, query, supplier]);
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);
  const inventoryValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const lowStock = items.filter((item) => item.quantity <= item.lowStockThreshold);

  const saveItem = async (value: typeof blankItem, item?: InventoryItem) => {
    setSaving(true);
    try {
      if (item) await api.put(`/api/inventory/${item._id}`, value);
      else await api.post("/api/inventory", value);
      showToast("Inventory item saved.", "success");
      setAddOpen(false);
      setEditing(null);
      await loadItems();
    } catch {
      showToast("Could not save item.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/api/inventory/${deleting._id}`);
      showToast("Inventory item deleted.", "success");
      setDeleting(null);
      await loadItems();
    } catch {
      showToast("Could not delete item.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns: Array<DataTableColumn<InventoryItem>> = [
    { header: "Item", cell: (item) => <span className="font-semibold text-slate-950 dark:text-white">{item.itemName}</span> },
    { header: "Quantity", cell: (item) => <span>{item.quantity} {item.quantity <= item.lowStockThreshold ? <Badge className="ml-2 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">Low stock</Badge> : null}</span> },
    { header: "Price", cell: (item) => formatCurrency(item.price) },
    { header: "Supplier", cell: (item) => item.supplier || "-" },
    { header: "Value", cell: (item) => formatCurrency(item.quantity * item.price) },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => setEditing(item)}><UserPen className="h-4 w-4" /></Button>
          <Button variant="ghost" className="h-9 w-9 px-0 text-rose-600" onClick={() => setDeleting(item)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      )
    }
  ];

  return (
    <AppShell title="Inventory">
      <PageHeader title="Inventory" description="Track clinical supplies, supplier coverage, and low-stock risk." badge="Stock" action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add item</Button>} />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <KpiCard label="Total inventory value" value={formatCurrency(inventoryValue)} icon={Package} />
        <KpiCard label="Low stock items" value={String(lowStock.length)} icon={AlertTriangle} />
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/10">
          <Search className="h-4 w-4" />
          <input className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:text-white" placeholder="Search item or supplier" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </div>
        <SelectInput label="Supplier filter" value={supplier} onChange={(event) => { setSupplier(event.target.value); setPage(1); }}>
          <option value="">All suppliers</option>
          {suppliers.map((itemSupplier) => <option key={itemSupplier} value={itemSupplier}>{itemSupplier}</option>)}
        </SelectInput>
      </div>
      {loading ? <SkeletonLoader /> : paginated.length ? <DataTable columns={columns} data={paginated} page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} /> : <EmptyState title="No inventory items" description="Add inventory to track stock levels." icon={Package} />}
      <Modal open={addOpen} title="Add inventory item" onClose={() => setAddOpen(false)}>
        <InventoryForm initialValue={blankItem} loading={saving} onSubmit={(value) => saveItem(value)} />
      </Modal>
      <Modal open={Boolean(editing)} title="Edit inventory item" onClose={() => setEditing(null)}>
        {editing ? <InventoryForm initialValue={{ itemName: editing.itemName, quantity: editing.quantity, price: editing.price, supplier: editing.supplier || "", lowStockThreshold: editing.lowStockThreshold }} loading={saving} onSubmit={(value) => saveItem(value, editing)} /> : null}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete inventory item" description="Delete this inventory item?" loading={saving} onClose={() => setDeleting(null)} onConfirm={deleteItem} />
    </AppShell>
  );
}
