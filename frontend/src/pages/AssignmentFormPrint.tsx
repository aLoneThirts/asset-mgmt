import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Printer } from "lucide-react";

import medicanaLogo from "@/assets/brand/medicana-logo.svg";
import { getAssignmentFormDocument } from "@/lib/firestore";

export function AssignmentFormPrintPage() {
  const { assignmentId = "" } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["document", "assignment-form", assignmentId],
    queryFn: () => getAssignmentFormDocument(assignmentId),
    enabled: Boolean(assignmentId),
  });

  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      window.print();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (!assignmentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-red-600">Belge numarasi bulunamadi.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-slate-500">Zimmet formu hazirlaniyor...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Belge olusturulamadi."}</p>
      </div>
    );
  }

  const assignedDate = new Date(data.assigned_at);
  const assignedDateText = Number.isNaN(assignedDate.getTime()) ? "-" : assignedDate.toLocaleDateString("tr-TR");
  const assignedDateTimeText = Number.isNaN(assignedDate.getTime()) ? "-" : assignedDate.toLocaleString("tr-TR");

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <style>{`
        @page {
          size: A4;
          margin: 10mm;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .a4-sheet {
            width: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Geri Don
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Printer size={16} />
          Yazdir
        </button>
      </div>

      <article className="a4-sheet mx-auto w-full max-w-[210mm] border border-slate-300 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="mb-4 border-b border-slate-300 pb-4">
          <div className="flex items-center justify-between">
            <img src={medicanaLogo} alt="Medicana" className="h-8 w-auto" />
            <div className="text-right text-xs text-slate-600">
              <p>DOKUMAN KODU: MSG.SC.FR.20</p>
              <p>YAYIN TARIHI: 03.01.2022</p>
              <p>SAYFA: 1/1</p>
            </div>
          </div>
          <h1 className="mt-4 text-center text-xl font-bold tracking-wide text-slate-900">ZIMMET TESLIM FORMU</h1>
        </header>

        <section className="space-y-2 text-sm">
          <div className="grid grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-700">PERSONEL ADI SOYADI:</p>
            <p>{data.personnel_name}</p>
          </div>
          <div className="grid grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-700">DEPARTMAN / BIRIM:</p>
            <p>{data.personnel_department || "-"}</p>
          </div>
          <div className="grid grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-700">UNVAN / GOREV:</p>
            <p>{data.personnel_title || "-"}</p>
          </div>
          <div className="grid grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-700">PERSONEL KODU:</p>
            <p>{data.personnel_employee_code || "-"}</p>
          </div>
        </section>

        <section className="mt-5">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                {["NO", "DEMIRBAS / MALZEME ADI", "MARKA / SERI NO / ID", "ADET", "TARIH", "TESLIM EDEN", "TESLIM ALAN"].map(
                  (header) => (
                    <th key={header} className="border border-slate-300 px-2 py-2 text-left font-semibold text-slate-700">
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-2">1</td>
                <td className="border border-slate-300 px-2 py-2">{data.asset_name}</td>
                <td className="border border-slate-300 px-2 py-2">
                  {[data.brand_model, data.serial_number, data.asset_code].filter(Boolean).join(" / ") || data.asset_code}
                </td>
                <td className="border border-slate-300 px-2 py-2">1</td>
                <td className="border border-slate-300 px-2 py-2">{assignedDateText}</td>
                <td className="border border-slate-300 px-2 py-2">Bilgi Sistemleri ({data.assigned_by})</td>
                <td className="border border-slate-300 px-2 py-2">{data.personnel_name}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-5 text-xs leading-relaxed text-slate-700">
          <p>
            Yukarida bilgileri bulunan demirbas/malzeme tarafima eksiksiz olarak teslim edilmistir. Kurum
            kurallarina uygun sekilde kullanacagimi, gorev degisikligi veya isten ayrilma durumunda demirbasi eksiksiz
            iade edecegimi kabul ve beyan ederim.
          </p>
          {data.note && <p className="mt-2 font-medium">Not: {data.note}</p>}
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-8 text-sm">
          <div className="rounded-lg border border-slate-300 p-4">
            <p className="font-semibold text-slate-700">TESLIM EDEN</p>
            <p className="mt-1 text-slate-600">Bilgi Sistemleri</p>
            <p className="mt-2 text-slate-600">Ad Soyad: {data.assigned_by}</p>
            <p className="mt-6 border-t border-dashed border-slate-300 pt-2 text-xs text-slate-500">Imza</p>
          </div>
          <div className="rounded-lg border border-slate-300 p-4">
            <p className="font-semibold text-slate-700">TESLIM ALAN</p>
            <p className="mt-2 text-slate-600">Ad Soyad: {data.personnel_name}</p>
            <p className="mt-1 text-slate-600">Tarih: {assignedDateTimeText}</p>
            <p className="mt-6 border-t border-dashed border-slate-300 pt-2 text-xs text-slate-500">Imza</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

