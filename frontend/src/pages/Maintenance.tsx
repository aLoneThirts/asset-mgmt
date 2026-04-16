import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";

import {
  createMaintenance,
  getAssets,
  getMaintenance,
  updateMaintenance,
  type Asset,
  type MaintenanceRecord,
  type MaintenanceStatus,
} from "@/lib/firestore";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

const STATUS_COLORS: Record<string, string> = {
  Acik: "bg-red-100 text-red-700",
  "Devam Ediyor": "bg-orange-100 text-orange-700",
  Cozuldu: "bg-green-100 text-green-700",
};

export function MaintenancePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: records = [], error, isLoading, refetch } = useQuery({
    queryKey: ["maintenance"],
    queryFn: getMaintenance,
  });

  async function handleStatusChange(record: MaintenanceRecord, status: MaintenanceStatus) {
    try {
      await updateMaintenance(record.id, status);
      toast.success("Ariza kaydi guncellendi.");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Guncelleme basarisiz.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ariza Takip</h1>
          <p className="mt-1 text-sm text-slate-500">Acilan tum ariza kayitlari burada tutulur.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Plus size={16} />
          Ariza Kaydi Ac
        </button>
      </div>

      {error && <QueryErrorState error={error} onRetry={() => void refetch()} title="Ariza kayitlari alinamadi" />}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Kayitlar yukleniyor...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Ariza kaydi bulunmuyor.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Ariza ID", "Demirbas", "Aciklama", "Bildiren", "Tarih", "Durum", ""].map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{record.fault_id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{record.asset_name}</p>
                    <p className="text-xs text-slate-400">{record.asset_id}</p>
                  </td>
                  <td className="max-w-md px-4 py-3 text-slate-600">{record.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{record.reported_by_email}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(record.date).toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[record.status] || "bg-slate-100 text-slate-700"}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {record.status !== "Cozuldu" && (
                      <select
                        defaultValue={record.status}
                        onChange={(event) => void handleStatusChange(record, event.target.value as MaintenanceStatus)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      >
                        <option value="Acik">Acik</option>
                        <option value="Devam Ediyor">Devam Ediyor</option>
                        <option value="Cozuldu">Cozuldu</option>
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
          onClose={() => setShowModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["maintenance"] });
            qc.invalidateQueries({ queryKey: ["assets"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["logs"] });
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddMaintenanceModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: getAssets,
  });

  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const selectableAssets = assets.filter((asset) => asset.status !== "Hurda");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const asset = selectableAssets.find((item: Asset) => item.id === assetId);
    if (!asset) {
      toast.error("Lutfen bir demirbas secin.");
      return;
    }

    setLoading(true);
    try {
      await createMaintenance(asset.id, description);
      toast.success("Ariza kaydi olusturuldu.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kayit olusturulamadi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Yeni Ariza Kaydi</h2>
          <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Demirbas
            </label>
            <select
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">Seciniz...</option>
              {selectableAssets.map((asset: Asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_id} - {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Aciklama
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
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
