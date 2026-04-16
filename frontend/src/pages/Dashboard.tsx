import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, Package, Wrench } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getDashboard, type Log, type Notification, type StockItem } from "@/lib/firestore";

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  if (isLoading) return <LoadingSkeleton />;

  const stats = [
    { label: "Toplam Demirbas", value: data?.total_assets ?? 0, icon: Package, color: "bg-blue-50 text-blue-600" },
    { label: "Arizali Urun", value: data?.broken_assets ?? 0, icon: Wrench, color: "bg-red-50 text-red-500" },
    { label: "Acik Ariza", value: data?.open_maintenance ?? 0, icon: ClipboardList, color: "bg-orange-50 text-orange-500" },
    { label: "Kritik Stok", value: data?.low_stock_count ?? 0, icon: AlertTriangle, color: "bg-yellow-50 text-yellow-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Hos geldiniz, {user?.displayName || user?.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <LowStockPanel items={data?.low_stock_items ?? []} />
          <LogsPanel logs={data?.recent_logs ?? []} />
        </div>
        <NotificationsPanel notifications={data?.notifications ?? []} />
      </div>
    </div>
  );
}

function LowStockPanel({ items }: { items: StockItem[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-slate-900">Kritik Stok Uyarilari</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length === 0 && <p className="px-6 py-8 text-sm text-slate-400">Kritik stok bulunmuyor.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-6 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-400">{item.category || "Kategori yok"}</p>
            </div>
            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
              {item.quantity} / min {item.min_quantity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogsPanel({ logs }: { logs: Log[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-slate-900">Son Islemler</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {logs.length === 0 && <p className="px-6 py-8 text-sm text-slate-400">Log kaydi bulunmuyor.</p>}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{log.detail}</p>
              <p className="mt-1 text-xs text-slate-400">{log.user} · {log.action}</p>
            </div>
            <span className="whitespace-nowrap text-xs text-slate-400">
              {new Date(log.date).toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-slate-900">Bildirimler</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {notifications.length === 0 && <p className="px-6 py-8 text-sm text-slate-400">Yeni bildirim yok.</p>}
        {notifications.map((notification) => (
          <div key={notification.id} className="px-6 py-4">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  notification.type === "stock" ? "bg-yellow-500" : "bg-red-500"
                }`}
              />
              <p className="text-sm font-medium text-slate-900">{notification.title}</p>
            </div>
            <p className="mt-1 text-sm text-slate-500">{notification.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
