import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import toast from "react-hot-toast";

import { uploadAssetExcel, type ImportResult } from "@/lib/firestore";
import { isQuotaError } from "@/lib/query-errors";

const EXPECTED_COLUMNS = [
  "Demirbas ID",
  "Urun Adi",
  "Seri No",
  "Kategori",
  "Marka / Model",
  "Durum",
  "Lokasyon",
  "Eklenme Tarihi",
];

const LIGHTHOUSE_COLUMNS = [
  "Lighthouse Otomatik Olusturulan Kod",
  "Marka",
  "Model",
  "Seri Numarasi",
  "Kategori",
  "Kategori Agaci",
  "Durum",
  "Konum",
  "Olusturma Tarihi",
];

export function ImportPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSelect(nextFile: File | undefined) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".xlsx") && !nextFile.name.toLowerCase().endsWith(".xls")) {
      toast.error("Sadece .xlsx veya .xls dosyalari kabul edilir.");
      return;
    }
    setFile(nextFile);
    setResult(null);
    setErrorMessage(null);
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    try {
      const summary = await uploadAssetExcel(file);
      setResult(summary);
      setErrorMessage(null);
      toast.success("Excel import tamamlandi.");
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import islemi basarisiz.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Excel Import</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lighthouse ciktilarini backend uzerinde Pandas ile isleyip Firestore&apos;a aktarir.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="mb-3 text-sm font-semibold text-blue-900">Beklenen kolonlar</p>
        <div className="flex flex-wrap gap-2">
          {EXPECTED_COLUMNS.map((column) => (
            <span key={column} className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
              {column}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-blue-700">
          Zorunlu alanlar: <strong>Demirbas ID</strong> ve <strong>Urun Adi</strong>. Lokasyon ne gelirse gelsin
          sistem kaydi Genel Merkez olarak sabitler.
        </p>
        <p className="mt-3 text-xs text-blue-700">
          Not: Lighthouse export dosyalarindaki kolonlar da destekleniyor. Ornek eslesmeler asagidadir.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LIGHTHOUSE_COLUMNS.map((column) => (
            <span key={column} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-200">
              {column}
            </span>
          ))}
        </div>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(event) => {
          event.preventDefault();
          handleSelect(event.dataTransfer.files?.[0]);
        }}
        onDragOver={(event) => event.preventDefault()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
          file ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-400 hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event) => handleSelect(event.target.files?.[0])}
        />

        <FileSpreadsheet size={40} className={`mx-auto mb-3 ${file ? "text-brand-600" : "text-slate-300"}`} />

        {file ? (
          <>
            <p className="font-semibold text-slate-900">{file.name}</p>
            <p className="mt-1 text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </>
        ) : (
          <>
            <p className="font-medium text-slate-700">Dosyayi surukleyip birakin veya tiklayin</p>
            <p className="mt-1 text-sm text-slate-400">.xlsx ve .xls formatlari desteklenir</p>
          </>
        )}
      </div>

      {file && result === null && (
        <button
          onClick={() => void handleUpload()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Aktariliyor...
            </>
          ) : (
            <>
              <Upload size={16} />
              Aktarimi Baslat
            </>
          )}
        </button>
      )}

      {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-900">Import hatasi</p>
            <p className="mt-1 text-sm text-red-800">{errorMessage}</p>
            {isQuotaError(new Error(errorMessage)) && (
              <p className="mt-3 text-xs text-red-700">
                Bu durumda demirbaslar silinmis olmaz. Firestore gecici olarak kota sinirina takildigi icin import ve listeleme
                cevap veremez.
              </p>
            )}
          </div>
        )}

      {result && (
        <div className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Import tamamlandi</p>
              <p className="mt-1 text-sm text-green-800">
                Yeni kayit: {result.imported_count}, guncellenen: {result.updated_count}, atlanan: {result.skipped_count}
              </p>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-white/80 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">Uyarilar</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
