import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface Log { id: string; user: string; action: string; detail: string; date: string; }

export function LogsPage() {
  const { data: logs = [], isLoading } = useQuery<Log[]>({
    queryKey: ["logs"],
    queryFn: () => api.get("/api/v1/logs/?limit=200").then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Sistem Logları</h1>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Log kaydı yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                {["Kullanıcı","İşlem","Detay","Tarih"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 text-xs">{log.user}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-md font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.detail}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
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
