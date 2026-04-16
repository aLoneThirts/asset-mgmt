import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Files, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

import { downloadAssignmentsCsv, downloadExcelReport, getReportSummary } from "@/lib/firestore";

export function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-summary"],
    queryFn: getReportSummary,
  });

  async function handleDownload(filename: string, action: () => Promise<Blob>) {
    try {
      const blob = await action();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Rapor indirildi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rapor indirilemedi.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Raporlama ve Export</h1>
        <p className="mt-1 text-sm text-slate-500">
          Yonetim raporlarini olusturun, Excel ciktilarini indirin ve zimmet durumunu toplu gorun.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Toplam Personel"
          value={isLoading ? "..." : String(data?.total_personnel ?? 0)}
          icon={<UserCheck size={18} className="text-brand-600" />}
        />
        <SummaryCard
          title="Aktif Zimmet"
          value={isLoading ? "..." : String(data?.active_assignments ?? 0)}
          icon={<Files size={18} className="text-emerald-600" />}
        />
        <SummaryCard
          title="Bos Demirbas"
          value={isLoading ? "..." : String(data?.unassigned_assets ?? 0)}
          icon={<FileSpreadsheet size={18} className="text-orange-600" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Excel Rapor Paketi</h2>
          <p className="mt-2 text-sm text-slate-500">
            Demirbaslar, ariza kayitlari, personel, zimmet ve stok sayfalarini tek Excel dosyasinda indirir.
          </p>
          <button
            onClick={() => void handleDownload("asset-management-report.xlsx", downloadExcelReport)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Download size={16} />
            Excel Paketi Indir
          </button>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Zimmet CSV Ciktisi</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tum zimmet gecmisini ve aktif/iade durumunu operasyon ekipleri icin hizli CSV olarak indirir.
          </p>
          <button
            onClick={() => void handleDownload("zimmet-raporu.csv", downloadAssignmentsCsv)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            CSV Indir
          </button>
        </section>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <h2 className="text-lg font-semibold text-blue-900">Rapor Notu</h2>
        <p className="mt-2 text-sm text-blue-800">
          Raporlar indirildigi anda Firestore’daki guncel veriden uretilir. En son olusturma zamani:
          {" "}
          <strong>{data?.exported_at ? new Date(data.exported_at).toLocaleString("tr-TR") : "-"}</strong>
        </p>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{title}</p>
    </div>
  );
}
