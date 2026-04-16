import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  getMaintenance, createMaintenance, updateMaintenance, getAssets,
} from "@/lib/firestore";
import type { MaintenanceRecord, Asset } from "@/lib/firestore";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Açık":         "bg-red-100 text-red-700",
  "Devam Ediyor": "bg-orange-100 text-orange-700",
  "Çözüldü":      "bg-green-100 text-green-700",
};

export function MaintenancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: records = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance"],
    queryFn: getMaintenance,
  });

  const handleStatusChange = async (record: MaintenanceRecord, status: string) => {
    try {
      await updateMaintenance(record.id, status, record.asset_id, user!.email!);
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Güncellendi.");
    } catch {
      toast.error("Güncelleme başarısız.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Arıza Takip</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus size={16} /> Arıza Kaydı Aç
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Yükleniyor...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Arıza kaydı yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                {["Demirbaş","Açıklama","Bildiren","Tarih","Durum",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.asset_name}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.reported_by_email}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.date).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status !== "Çözüldü" && (
                      <select
                        defaultValue={r.status}
                        onChange={e => handleStatusChange(r, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option>Açık</option>
                        <option>Devam Ediyor</option>
                        <option>Çözüldü</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AddMaintenanceModal
          userEmail={user!.email!}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["maintenance"] });
            qc.invalidateQueries({ queryKey: ["assets"] });
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddMaintenanceModal({ userEmail, onClose, onSaved }: {
  userEmail: string; onClose: () => void; onSaved: () => void;
}) {
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: getAssets,
  });

  const [assetId, setAssetId] = useState("");
  const [desc, setDesc]       = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    setLoading(true);
    try {
      await createMaintenance(asset.id, asset.name, desc, userEmail);
      toast.success("Arıza kaydı oluşturuldu.");
      onSaved();
    } catch {
      toast.error("Kayıt oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Yeni Arıza Kaydı</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Demirbaş</label>
            <select value={assetId} onChange={e => setAssetId(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Seçiniz...</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Açıklama</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} required rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
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
