import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Search, Trash2, Pencil, X } from "lucide-react";

interface Asset {
  id: string; name: string; serial_no?: string; category?: string;
  brand?: string; model?: string; status: string; location: string; added_at?: string;
}

const STATUS_COLORS: Record<string, string> = {
  "Aktif":   "bg-green-100 text-green-700",
  "Arızalı": "bg-red-100 text-red-700",
  "Hurda":   "bg-slate-100 text-slate-600",
};

export function AssetsPage() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState("");
  const [filterStatus, setFS] = useState("");
  const [filterCat, setFC]    = useState("");
  const [modal, setModal]     = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Asset | null>(null);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: () => api.get("/api/v1/assets/").then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); toast.success("Silindi."); },
    onError: () => toast.error("Silinemedi."),
  });

  const filtered = assets.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    const matchCat    = !filterCat || a.category === filterCat;
    return matchSearch && matchStatus && matchCat;
  });

  const categories = [...new Set(assets.map(a => a.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Demirbaşlar</h1>
        <button onClick={() => setModal("add")}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus size={16} /> Demirbaş Ekle
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ara (isim / ID)..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64" />
        </div>
        <select value={filterStatus} onChange={e => setFS(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Tüm Durumlar</option>
          <option>Aktif</option><option>Arızalı</option><option>Hurda</option>
        </select>
        <select value={filterCat} onChange={e => setFC(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Tüm Kategoriler</option>
          {categories.map(c => <option key={c as string}>{c as string}</option>)}
        </select>
        {(search || filterStatus || filterCat) && (
          <button onClick={() => { setSearch(""); setFS(""); setFC(""); }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <X size={14} /> Temizle
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Demirbaş bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                {["ID","Ürün Adı","Seri No","Kategori","Marka/Model","Durum","Lokasyon",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{asset.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{asset.name}</td>
                  <td className="px-4 py-3 text-slate-500">{asset.serial_no ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{asset.category ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{[asset.brand, asset.model].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[asset.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{asset.location}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelected(asset); setModal("edit"); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition" title="Düzenle">
                        <Pencil size={14} className="text-slate-500" />
                      </button>
                      <button onClick={() => { if (confirm("Silmek istediğinize emin misiniz?")) deleteMut.mutate(asset.id); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition" title="Sil">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <AssetModal
          mode={modal}
          asset={selected}
          onClose={() => { setModal(null); setSelected(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["assets"] }); setModal(null); setSelected(null); }}
        />
      )}
    </div>
  );
}

function AssetModal({ mode, asset, onClose, onSaved }: {
  mode: "add" | "edit"; asset: Asset | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: asset?.name ?? "", serial_no: asset?.serial_no ?? "",
    category: asset?.category ?? "", brand: asset?.brand ?? "",
    model: asset?.model ?? "", status: asset?.status ?? "Aktif",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "add") await api.post("/api/v1/assets/", form);
      else await api.put(`/api/v1/assets/${asset!.id}`, form);
      toast.success(mode === "add" ? "Demirbaş eklendi." : "Güncellendi.");
      onSaved();
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{mode === "add" ? "Demirbaş Ekle" : "Demirbaş Düzenle"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Ürün Adı *" value={form.name} onChange={v => set("name", v)} required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Seri No" value={form.serial_no} onChange={v => set("serial_no", v)} />
            <Field label="Kategori" value={form.category} onChange={v => set("category", v)} />
            <Field label="Marka" value={form.brand} onChange={v => set("brand", v)} />
            <Field label="Model" value={form.model} onChange={v => set("model", v)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Durum</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option>Aktif</option><option>Arızalı</option><option>Hurda</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
              İptal
            </button>
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

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
    </div>
  );
}
