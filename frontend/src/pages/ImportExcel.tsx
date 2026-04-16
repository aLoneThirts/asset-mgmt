import { useState, useRef } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload, CheckCircle2 } from "lucide-react";

export function ImportPage() {
  const qc = useQueryClient();
  const inputRef            = useRef<HTMLInputElement>(null);
  const [file, setFile]     = useState<File | null>(null);
  const [loading, setLoad]  = useState(false);
  const [result, setResult] = useState<{ imported: number; message: string } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      setFile(f); setResult(null);
    } else {
      toast.error("Sadece .xlsx veya .xls dosyası yükleyebilirsiniz.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoad(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/api/v1/import/excel", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success(res.data.message);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail ?? "Yükleme başarısız.");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Excel İmport</h1>
        <p className="text-slate-500 text-sm mt-1">Lighthouse sisteminden aldığınız Excel dosyasını yükleyin.</p>
      </div>

      {/* Beklenen sütunlar */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-blue-800 mb-3">Beklenen Excel Sütunları</p>
        <div className="flex flex-wrap gap-2">
          {["Demirbaş ID","Ürün Adı","Seri No","Kategori","Marka","Model","Durum","Lokasyon","Eklenme Tarihi"].map(col => (
            <span key={col} className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">{col}</span>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-3">
          Sadece <strong>Ürün Adı</strong> zorunludur. Diğer sütunlar opsiyoneldir. Lokasyon otomatik "Genel Merkez" olarak atanır.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          file ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-400 hover:bg-slate-50"
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        <FileSpreadsheet size={40} className={`mx-auto mb-3 ${file ? "text-brand-500" : "text-slate-300"}`} />
        {file ? (
          <>
            <p className="font-semibold text-slate-900">{file.name}</p>
            <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB · Yüklemek için butona tıklayın</p>
          </>
        ) : (
          <>
            <p className="font-medium text-slate-700">Dosyayı sürükleyip bırakın</p>
            <p className="text-sm text-slate-400 mt-1">veya tıklayarak seçin (.xlsx, .xls)</p>
          </>
        )}
      </div>

      {/* Upload button */}
      {file && !result && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-60"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Yükleniyor...</>
            : <><Upload size={16} /> Aktarımı Başlat</>}
        </button>
      )}

      {/* Sonuç */}
      {result && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl p-5">
          <CheckCircle2 size={20} className="text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Aktarım Tamamlandı</p>
            <p className="text-sm text-green-700 mt-0.5">{result.message}</p>
            <button
              onClick={() => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="text-xs text-green-600 hover:underline mt-2 block"
            >
              Yeni dosya yükle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
