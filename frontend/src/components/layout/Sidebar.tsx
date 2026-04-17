import { NavLink } from "react-router-dom";
import {
  ShieldCheck,
  BarChart3,
  Bell,
  ContactRound,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Package,
  PieChart,
  ScrollText,
  Wrench,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import medicanaLogo from "@/assets/brand/medicana-logo.svg";

const links = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/assets", icon: Package, label: "Demirbaslar" },
  { to: "/maintenance", icon: Wrench, label: "Ariza Takip" },
  { to: "/stock", icon: BarChart3, label: "Stok" },
  { to: "/assignments", icon: ContactRound, label: "Zimmet & Personel" },
  { to: "/import", icon: FileSpreadsheet, label: "Excel Import" },
  { to: "/reports", icon: PieChart, label: "Raporlar" },
  { to: "/logs", icon: ScrollText, label: "Loglar" },
  { to: "/admin/users", icon: ShieldCheck, label: "Kullanicilar" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { count } = useNotifications();

  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-6 py-5">
        <img src={medicanaLogo} alt="Medicana Saglik Grubu" className="h-8 w-auto brightness-0 invert" />
        <p className="mt-4 text-lg font-bold text-white">Medicana Vercel App</p>
        <p className="mt-1 text-xs text-slate-400">Medicana icin kurumsal demirbas ve envanter merkezi</p>
      </div>

      <div className="border-b border-slate-800 px-4 py-4">
        <div className="rounded-2xl bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{user?.displayName || "Admin Kullanici"}</p>
              <p className="mt-1 text-xs text-slate-400">{user?.email}</p>
            </div>
            <div className="rounded-xl bg-slate-800 p-2 text-slate-300">
              <Bell size={16} />
            </div>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            Aktif bildirim: <strong>{count}</strong>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
        >
          <LogOut size={16} />
          Cikis Yap
        </button>
      </div>
    </aside>
  );
}
