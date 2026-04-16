import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import {
  createAsset,
  deleteAsset,
  getAssets,
  updateAsset,
  type Asset,
  type AssetPayload,
} from "@/lib/firestore";

const STATUS_COLORS: Record<string, string> = {
  Aktif: "bg-green-100 text-green-700",
  Arizali: "bg-red-100 text-red-700",
  Hurda: "bg-slate-100 text-slate-700",
};

export function AssetsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState<"asset_id" | "name" | "status">("name");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Asset | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: getAssets,
  });

  const categories = useMemo(
    () => [...new Set(assets.map((item) => item.category).filter(Boolean))] as string[],
    [assets],
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const items = assets.filter((item) => {
      const matchSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.asset_id.toLowerCase().includes(normalizedSearch);
      const matchStatus = !filterStatus || item.status === filterStatus;
      const matchCategory = !filterCategory || item.category === filterCategory;
      return matchSearch && matchStatus && matchCategory;
    });

    return [...items].sort((left, right) => {
      if (sortBy === "asset_id") return left.asset_id.localeCompare(right.asset_id);
      if (sortBy === "status") return left.status.localeCompare(right.status);
      return left.name.localeCompare(right.name);
    });
  }, [assets, filterCategory, filterStatus, search, sortBy]);

  async function handleDelete(asset: Asset) {
    if (!confirm(`${asset.asset_id} numarali demirbas silinsin mi?`)) return;

    try {
      await deleteAsset(asset.id);
      toast.success("Demirbas silindi.");
      qc.invalidateQueries({ queryKey: ["assets"] });
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
          <h1 className="text-2xl font-bold text-slate-900">Demirbas Listesi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tum kayitlar sabit olarak Genel Merkez lokasyonunda tutulur.
          </p>
        </div>

        <button
          onClick={() => setModal("add")}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Plus size={16} />
          Demirbas Ekle
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
          <div className="relative min-w-[240px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ID veya urun adi ara..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">Tum durumlar</option>
            <option value="Aktif">Aktif</option>
            <option value="Arizali">Arizali</option>
            <option value="Hurda">Hurda</option>
          </select>

          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">Tum kategoriler</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="name">Ada gore sirala</option>
            <option value="asset_id">ID'ye gore sirala</option>
            <option value="status">Duruma gore sirala</option>
          </select>

          {(search || filterStatus || filterCategory) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterStatus("");
                setFilterCategory("");
              }}
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-700"
            >
              <X size={14} />
              Temizle
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Kayitlar yukleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Eslesen demirbas bulunamadi.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Demirbas ID", "Urun Adi", "Seri No", "Kategori", "Marka / Model", "Durum", "Lokasyon", ""].map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((asset) => (
                <tr key={asset.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{asset.asset_id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{asset.name}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.serial_no || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.category || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.brand_model || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[asset.status] || "bg-slate-100 text-slate-700"}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{asset.location}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelected(asset);
                          setModal("edit");
                        }}
                        className="rounded-lg p-2 transition hover:bg-slate-100"
                        title="Duzenle"
                      >
                        <Pencil size={14} className="text-slate-500" />
                      </button>
                      <button
                        onClick={() => void handleDelete(asset)}
                        className="rounded-lg p-2 transition hover:bg-red-50"
                        title="Sil"
                      >
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

      {modal && (
        <AssetModal
          mode={modal}
          asset={selected}
          assets={assets}
          onClose={() => {
            setModal(null);
            setSelected(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["assets"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["logs"] });
            setModal(null);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function AssetModal({
  mode,
  asset,
  assets,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  asset: Asset | null;
  assets: Asset[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AssetPayload>({
    asset_id: asset?.asset_id ?? "",
    name: asset?.name ?? "",
    serial_no: asset?.serial_no ?? "",
    category: asset?.category ?? "",
    brand_model: asset?.brand_model ?? "",
    status: asset?.status ?? "Aktif",
    added_at: asset?.added_at ?? "",
  });
  const [loading, setLoading] = useState(false);

  const productHints = useMemo(() => {
    const normalizedName = form.name.trim().toLowerCase();
    if (!normalizedName) return [];

    const ranked = assets
      .filter((item) => item.id !== asset?.id)
      .map((item) => {
        const candidate = item.name.trim().toLowerCase();
        let score = 0;
        if (candidate === normalizedName) score += 5;
        if (candidate.startsWith(normalizedName) || normalizedName.startsWith(candidate)) score += 3;
        if (candidate.includes(normalizedName) || normalizedName.includes(candidate)) score += 2;
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name));

    return ranked.slice(0, 3).map(({ item }) => item);
  }, [asset?.id, assets, form.name]);

  const suggestedAsset = productHints[0];

  function setValue<K extends keyof AssetPayload>(key: K, value: AssetPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleNameChange(value: string) {
    setForm((current) => {
      const next = { ...current, name: value };
      const normalizedName = value.trim().toLowerCase();
      const match = assets
        .filter((item) => item.id !== asset?.id)
        .find((item) => item.name.trim().toLowerCase() === normalizedName);

      if (match) {
        if (!current.category?.trim()) next.category = match.category ?? "";
        if (!current.brand_model?.trim()) next.brand_model = match.brand_model ?? "";
      }

      return next;
    });
  }

  function applySuggestion(item: Asset) {
    setForm((current) => ({
      ...current,
      category: item.category ?? current.category ?? "",
      brand_model: item.brand_model ?? current.brand_model ?? "",
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      if (mode === "add") {
        await createAsset(form);
        toast.success("Demirbas eklendi.");
      } else if (asset) {
        await updateAsset(asset.id, form);
        toast.success("Demirbas guncellendi.");
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
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === "add" ? "Yeni Demirbas" : "Demirbas Duzenle"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Lokasyon sabit olarak Genel Merkez uygulanir.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Demirbas ID *"
              value={form.asset_id}
              disabled={mode === "edit"}
              onChange={(value) => setValue("asset_id", value)}
              required
            />
            <Field label="Urun Adi *" value={form.name} onChange={handleNameChange} required />
            <Field label="Seri No" value={form.serial_no || ""} onChange={(value) => setValue("serial_no", value)} />
            <Field label="Kategori" value={form.category || ""} onChange={(value) => setValue("category", value)} />
            <Field
              label="Marka / Model"
              value={form.brand_model || ""}
              onChange={(value) => setValue("brand_model", value)}
            />
            <Field
              label="Eklenme Tarihi"
              value={form.added_at ? form.added_at.slice(0, 10) : ""}
              onChange={(value) => setValue("added_at", value ? new Date(value).toISOString() : "")}
              type="date"
            />
          </div>

          {mode === "add" && suggestedAsset && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Otomatik onerilen bilgiler</p>
              <p className="mt-1 text-sm text-blue-800">
                Benzer urun bulundu: <strong>{suggestedAsset.name}</strong>
              </p>
              <p className="mt-2 text-xs text-blue-700">
                Kategori: {suggestedAsset.category || "-"} · Marka / Model: {suggestedAsset.brand_model || "-"}
              </p>
              <button
                type="button"
                onClick={() => applySuggestion(suggestedAsset)}
                className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Bu bilgileri uygula
              </button>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Durum
            </label>
            <select
              value={form.status}
              onChange={(event) => setValue("status", event.target.value as AssetPayload["status"])}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="Aktif">Aktif</option>
              <option value="Arizali">Arizali</option>
              <option value="Hurda">Hurda</option>
            </select>
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
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  type?: "text" | "date";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </div>
  );
}
