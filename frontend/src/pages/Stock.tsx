import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

import { createStock, deleteStock, getStock, updateStock, type StockItem } from "@/lib/firestore";

export function StockPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["stock"],
    queryFn: getStock,
  });

  const lowCount = items.filter((item) => item.low_stock).length;

  async function handleDelete(item: StockItem) {
    if (!confirm(`${item.name} stok kalemi silinsin mi?`)) return;

    try {
      await deleteStock(item.id);
      toast.success("Stok kalemi silindi.");
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Silme islemi basarisiz.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stok Yonetimi</h1>
          {lowCount > 0 && (
            <p className="mt-1 flex items-center gap-1 text-sm text-yellow-700">
              <AlertTriangle size={14} />
              {lowCount} kalem kritik stok seviyesinde
            </p>
          )}
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Plus size={16} />
          Stok Ekle
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Stok verisi yukleniyor...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Kayitli stok bulunmuyor.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Urun", "Kategori", "Miktar", "Min. Stok", "Birim", "Durum", ""].map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className={item.low_stock ? "bg-yellow-50/40" : ""}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.category || "-"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{item.min_quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{item.unit || "adet"}</td>
                  <td className="px-4 py-3">
                    {item.low_stock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                        <AlertTriangle size={11} />
                        Kritik
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditing(item);
                          setShowModal(true);
                        }}
                        className="text-xs font-semibold text-brand-600 transition hover:underline"
                      >
                        Duzenle
                      </button>
                      <button
                        onClick={() => void handleDelete(item)}
                        className="text-xs font-semibold text-red-500 transition hover:underline"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <StockModal
          item={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["stock"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["logs"] });
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function StockModal({
  item,
  onClose,
  onSaved,
}: {
  item: StockItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    category: item?.category ?? "",
    quantity: item?.quantity ?? 0,
    min_quantity: item?.min_quantity ?? 5,
    unit: item?.unit ?? "adet",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      if (item) {
        await updateStock(item.id, form);
        toast.success("Stok kalemi guncellendi.");
      } else {
        await createStock(form);
        toast.success("Stok kalemi eklendi.");
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Islem basarisiz.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{item ? "Stok Duzenle" : "Yeni Stok Kalemi"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <Field label="Urun Adi *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Kategori" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} />
            <Field label="Birim" value={form.unit} onChange={(value) => setForm((current) => ({ ...current, unit: value }))} />
            <NumberField label="Miktar" value={form.quantity} onChange={(value) => setForm((current) => ({ ...current, quantity: value }))} />
            <NumberField
              label="Minimum Stok"
              value={form.min_quantity}
              onChange={(value) => setForm((current) => ({ ...current, min_quantity: value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Iptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}
