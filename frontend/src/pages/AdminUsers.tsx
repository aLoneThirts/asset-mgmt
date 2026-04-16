import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, ShieldOff, Users } from "lucide-react";
import toast from "react-hot-toast";

import { getAdminUsers, updateAdminRole, type AdminUser } from "@/lib/firestore";

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: getAdminUsers,
  });

  const roleMutation = useMutation({
    mutationFn: ({ uid, isAdmin }: { uid: string; isAdmin: boolean }) => updateAdminRole(uid, isAdmin),
    onSuccess: (_, variables) => {
      toast.success(variables.isAdmin ? "Admin yetkisi verildi." : "Admin yetkisi kaldirildi.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Yetki guncellenemedi.");
    },
  });

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return users;

    return users.filter((user) => {
      const haystack = [user.email, user.name, user.uid].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [search, users]);

  const adminCount = users.filter((user) => user.is_admin).length;

  function handleRoleChange(user: AdminUser, nextValue: boolean) {
    roleMutation.mutate({ uid: user.uid, isAdmin: nextValue });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Paneli</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kullanici hesaplarini goruntuleyin ve admin yetkilerini buradan yonetin.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Toplam kullanici</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Users size={18} className="text-brand-600" />
            {users.length}
            <span className="text-sm font-medium text-slate-500">Admin: {adminCount}</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="E-posta, isim veya UID ara..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Kullanicilar yukleniyor...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Eslesen kullanici bulunamadi.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Kullanici", "Durum", "Olusturulma", "Son Giris", "UID", ""].map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isPending = roleMutation.isPending && roleMutation.variables?.uid === user.uid;

                return (
                  <tr key={user.uid} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{user.name || "Isimsiz kullanici"}</p>
                        <p className="mt-1 text-xs text-slate-500">{user.email || "-"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            user.is_admin
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.is_admin ? "Admin" : "Standart"}
                        </span>
                        {user.disabled && (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                            Pasif
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.last_sign_in_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{user.uid}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRoleChange(user, !user.is_admin)}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                          user.is_admin
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {user.is_admin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                        {isPending ? "Guncelleniyor..." : user.is_admin ? "Adminligi Kaldir" : "Admin Yap"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
