import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Package, Wrench, AlertTriangle, ClipboardList } from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/api/v1/dashboard/").then(r => r.data),
  });

  if (isLoading) return <Loading />;

  const stats = [
    { label: "Toplam Demirbaş",    value: data?.total_assets ?? 0,    icon: Package,       color: "bg-blue-50 text-blue-600"   },
    { label: "Arızalı Ürün",       value: data?.broken_assets ?? 0,   icon: Wrench,        color: "bg-red-50 text-red-500"     },
    { label: "Açık Arıza",         value: data?.open_maintenance ?? 0, icon: ClipboardList, color: "bg-orange-50 text-orange-500"},
    { label: "Kritik Stok",        value: data?.low_stock_count ?? 0,  icon: AlertTriangle, color: "bg-yellow-50 text-yellow-600"},
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Hoş geldiniz, {user?.displayName || user?.email}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Kritik stok uyarıları */}
      {data?.low_stock_items?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <h2 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} /> Kritik Stok Uyarıları
          </h2>
          <div className="space-y-2">
            {data.low_stock_items.map((item: { id: string; name: string; quantity: number; min_quantity: number }) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-yellow-900 font-medium">{item.name}</span>
                <span className="text-yellow-700">
                  {item.quantity} / min {item.min_quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Son işlemler */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Son İşlemler</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {data?.recent_logs?.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-slate-400">Henüz işlem yok.</p>
          )}
          {data?.recent_logs?.map((log: { id: string; user: string; action: string; detail: string; date: string }) => (
            <div key={log.id} className="px-6 py-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{log.detail}</p>
                <p className="text-xs text-slate-400 mt-0.5">{log.user} · {log.action}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                {new Date(log.date).toLocaleString("tr-TR")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
