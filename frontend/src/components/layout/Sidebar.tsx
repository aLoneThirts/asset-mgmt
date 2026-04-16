import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Package, Wrench, BarChart3,
  FileSpreadsheet, ScrollText, LogOut,
} from "lucide-react";

const links = [
  { to: "/dashboard",   icon: LayoutDashboard,  label: "Dashboard"   },
  { to: "/assets",      icon: Package,           label: "Demirbaşlar" },
  { to: "/maintenance", icon: Wrench,            label: "Arıza Takip" },
  { to: "/stock",       icon: BarChart3,         label: "Stok"        },
  { to: "/import",      icon: FileSpreadsheet,   label: "Excel İmport"},
  { to: "/logs",        icon: ScrollText,        label: "Loglar"      },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <p className="text-white font-bold text-lg">AssetTrack</p>
        <p className="text-slate-400 text-xs mt-0.5">Demirbaş Yönetimi</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User & logout */}
      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-slate-400 text-xs truncate mb-3">{user?.email}</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
