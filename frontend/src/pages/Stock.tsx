import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getStock, createStock, updateStock, deleteStock } from "@/lib/firestore";
import type { StockItem } from "@/lib/firestore";
import toast from "react-hot-toast";
import { Plus, X, AlertTriangle } from "lucide-react";

export function StockPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<StockItem | null>(null);

  const { data: items = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["stock"],
    queryFn: getStock,
  });

  const handleDelete = async (item: StockItem) => {
    if (!confirm("Silinsin mi?")) return;
    try {
      await deleteStock(item.id, item.name, user!.email!);
      qc.invalidateQueries({ queryKey: ["stock"] });
      toast.success("Silindi.");
    } catch {
      toast.error("Silinemedi.");
    }
  };

  const lowCount = items.filter(i => i.low_stock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stok Yönetimi</h1>
          {lowCount > 0 && (
            <p className="text-sm text-yellow-600 flex items-center gap-1 mt-1">
              <AlertTriangle size={14} /> {lowCount} kalem kritik stok seviyesinde
            </p>
          )}
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus size={16} /> Stok Ekle
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Stok kalemi yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                {["Ürün","Kategori","Miktar","Min. Stok","Birim","Durum",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50 ${item.low_stock ? "bg-yellow-50/50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${item.low_stock ? "text-red-600" : "text-slate-900"}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.min_quantity}</td>
                  <td className="px-4 py-3 text-slate-500">{item.unit ?? "adet"}</td>
                  <td className="px-4 py-3">
                    {item.low_stock ? (
                      <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full w-fit">
                        <AlertTriangle size={11} /> Kritik
                      </span>
                    ) : (
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Normal</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(item); setShowModal(true); }}
                        className="text-xs text-brand-600 hover:underline">Düzenle</button>
                      <button onClick={() => handleDelete(item)}
                        className="text-xs text-red-500 hover:underline">Sil</button>
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
          userEmail={user!.email!}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["stock"] }); setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function StockModal({ item, userEmail, onClose, onSaved }: {
  item: StockItem | null; userEmail: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "", category: item?.category ?? "",
    quantity: item?.quantity ?? 0, min_quantity: item?.min_quantity ?? 5,
    unit: item?.unit ?? "adet",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (item) {
        await updateStock(item.id, form, item, userEmail);
      } else {
        await createStock(form, userEmail);
      }
      toast.success(item ? "Güncellendi." : "Stok eklendi.");
      onSaved();
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{item ? "Stok Güncelle" : "Stok Ekle"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Ürün Adı *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Miktar</label>
              <input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Min. Stok</label>
              <input type="number" min={0} value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: +e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Kategori</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Birim</label>
              <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium disabled:opacity-60">
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
