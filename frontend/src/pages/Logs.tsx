import { useQuery } from "@tanstack/react-query";

import { getLogs, type Log } from "@/lib/firestore";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

export function LogsPage() {
  const { data: logs = [], error, isLoading, refetch } = useQuery<Log[]>({
    queryKey: ["logs"],
    queryFn: () => getLogs(200),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sistem Loglari</h1>
        <p className="mt-1 text-sm text-slate-500">Girisler, importlar ve tum kritik islemler burada listelenir.</p>
      </div>

      {error && <QueryErrorState error={error} onRetry={() => void refetch()} title="Log kayitlari alinamadi" />}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loglar yukleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Log kaydi bulunmuyor.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Kullanici", "Islem", "Detay", "Tarih"].map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-600">{log.user}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.detail}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                    {new Date(log.date).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
