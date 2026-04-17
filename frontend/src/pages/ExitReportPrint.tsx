import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import medicanaLogo from "@/assets/brand/medicana-logo.svg";
import { useAuth } from "@/context/AuthContext";
import { getExitReport } from "@/lib/firestore";

function buildDisplayName(displayName?: string | null, email?: string | null) {
  const cleanedDisplayName = (displayName || "").trim();
  if (cleanedDisplayName) return cleanedDisplayName;

  const emailPrefix = (email || "").split("@")[0]?.trim();
  if (!emailPrefix) return "Sistem Kullanicisi";

  return emailPrefix
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function ExitReportPrintPage() {
  const { reportId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["document", "exit-report", reportId],
    queryFn: () => getExitReport(reportId),
    enabled: Boolean(reportId),
  });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Isten Cikis Tutanagi";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      window.print();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (!reportId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-red-600">Tutanak numarasi bulunamadi.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-slate-500">Tutanak hazirlaniyor...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Tutanak olusturulamadi."}</p>
      </div>
    );
  }

  const meetingDate = new Date(data.meeting_date);
  const meetingDateText = Number.isNaN(meetingDate.getTime()) ? "-" : meetingDate.toLocaleDateString("tr-TR");
  const createdAt = new Date(data.created_at);
  const createdAtText = Number.isNaN(createdAt.getTime()) ? "-" : createdAt.toLocaleString("tr-TR");
  const receiverName = buildDisplayName(user?.displayName, user?.email);
  const receiverUnit = "BILGI SISTEMLERI";

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
        <header className="mb-6 border-b border-slate-300 pb-4">
          <div className="flex items-center justify-between">
            <img src={medicanaLogo} alt="Medicana" className="h-8 w-auto" />
            <div className="text-right text-xs text-slate-600">
              <p>TUTANAK NO: {data.id}</p>
              <p>OLUSTURMA: {createdAtText}</p>
              <p>TARIH: {meetingDateText}</p>
            </div>
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold tracking-wide text-slate-900">TUTANAK</h1>
        </header>

        <section className="space-y-2 text-sm">
          <div className="grid grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-700">PERSONEL ADI SOYADI:</p>
            <p>{data.personnel_name}</p>
          </div>
          <div className="grid grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-700">DEPARTMAN / BIRIM:</p>
            <p>{data.department || "-"}</p>
          </div>
          <div className="grid grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-700">UNVAN / GOREV:</p>
            <p>{data.title || "-"}</p>
          </div>
          <div className="grid grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-700">PERSONEL KODU:</p>
            <p>{data.employee_code || "-"}</p>
          </div>
        </section>

        <section className="mt-5">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                {["NO", "DEMIRBAS ADI", "DEMIRBAS ID", "MARKA / SERI NO", "ZIMMET TARIHI", "DURUM"].map((header) => (
                  <th key={header} className="border border-slate-300 px-2 py-2 text-left font-semibold text-slate-700">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-slate-300 px-2 py-3 text-center text-slate-500">
                    Bu personele ait zimmet kaydi bulunamadi.
                  </td>
                </tr>
              ) : (
                data.assets.map((asset, index) => {
                  const assignedAt = new Date(asset.assigned_at);
                  const assignedAtText = Number.isNaN(assignedAt.getTime()) ? "-" : assignedAt.toLocaleDateString("tr-TR");
                  return (
                    <tr key={`${asset.assignment_id}-${asset.asset_id}`}>
                      <td className="border border-slate-300 px-2 py-2">{index + 1}</td>
                      <td className="border border-slate-300 px-2 py-2">{asset.asset_name}</td>
                      <td className="border border-slate-300 px-2 py-2">{asset.asset_code}</td>
                      <td className="border border-slate-300 px-2 py-2">
                        {[asset.brand_model, asset.serial_number].filter(Boolean).join(" / ") || "-"}
                      </td>
                      <td className="border border-slate-300 px-2 py-2">{assignedAtText}</td>
                      <td className="border border-slate-300 px-2 py-2">{asset.is_active ? "Hala Zimmetli" : "Iade Edildi"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <section className="mt-5 text-xs leading-relaxed text-slate-700">
          <p>
            Yukarida listelenen demirbaslar ve zimmet gecmisi, personel isten ayrilis sureci kapsaminda tutanak altina
            alinmistir. Varsa eksik ya da iade edilmemis cihazlar icin ilgili birimlerin onayi ile takip sureci
            baslatilir.
          </p>
          {data.note && <p className="mt-2 font-medium">Not: {data.note}</p>}
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-8 text-sm">
          <div className="rounded-lg border border-slate-300 p-4">
            <p className="font-semibold text-slate-700">TESLIM ALAN</p>
            <p className="mt-1 text-slate-600">Ad Soyad: {receiverName}</p>
            <p className="mt-1 text-slate-600">{receiverUnit}</p>
            <p className="mt-6 border-t border-dashed border-slate-300 pt-2 text-xs text-slate-500">Ad Soyad / Imza</p>
          </div>
          <div className="rounded-lg border border-slate-300 p-4">
            <p className="font-semibold text-slate-700">TESLIM EDEN</p>
            <p className="mt-1 text-slate-600">{data.personnel_name}</p>
            <p className="mt-6 border-t border-dashed border-slate-300 pt-2 text-xs text-slate-500">Ad Soyad / Imza</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
