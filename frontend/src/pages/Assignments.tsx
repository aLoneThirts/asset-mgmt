import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContactRound, FileText, Plus, Printer, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { Pagination } from "@/components/ui/Pagination";
import {
  createAssignment,
  createExitReport,
  createPersonnel,
  deletePersonnel,
  getAssignments,
  getAssets,
  getPersonnel,
  returnAssignment,
  type Asset,
  type AssignmentRecord,
  type Personnel,
  type PersonnelPayload,
} from "@/lib/firestore";

const PAGE_SIZE = 25;

export function AssignmentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [personnelModal, setPersonnelModal] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [exitReportModal, setExitReportModal] = useState(false);
  const [exitReportPersonnelId, setExitReportPersonnelId] = useState("");
  const [personnelPage, setPersonnelPage] = useState(1);
  const [activeAssignmentsPage, setActiveAssignmentsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: personnel = [], isLoading: personnelLoading } = useQuery({
    queryKey: ["personnel"],
    queryFn: getPersonnel,
  });

  const { data: assignments = [], isLoading: assignmentLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => getAssignments(false),
  });

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.is_active),
    [assignments],
  );

  const personnelTotalPages = Math.max(1, Math.ceil(personnel.length / PAGE_SIZE));
  const activeTotalPages = Math.max(1, Math.ceil(activeAssignments.length / PAGE_SIZE));
  const historyTotalPages = Math.max(1, Math.ceil(assignments.length / PAGE_SIZE));

  const pagedPersonnel = useMemo(() => {
    const start = (personnelPage - 1) * PAGE_SIZE;
    return personnel.slice(start, start + PAGE_SIZE);
  }, [personnel, personnelPage]);

  const pagedActiveAssignments = useMemo(() => {
    const start = (activeAssignmentsPage - 1) * PAGE_SIZE;
    return activeAssignments.slice(start, start + PAGE_SIZE);
  }, [activeAssignments, activeAssignmentsPage]);

  const pagedHistoryAssignments = useMemo(() => {
    const start = (historyPage - 1) * PAGE_SIZE;
    return assignments.slice(start, start + PAGE_SIZE);
  }, [assignments, historyPage]);

  useEffect(() => {
    if (personnelPage > personnelTotalPages) setPersonnelPage(personnelTotalPages);
  }, [personnelPage, personnelTotalPages]);

  useEffect(() => {
    if (activeAssignmentsPage > activeTotalPages) setActiveAssignmentsPage(activeTotalPages);
  }, [activeAssignmentsPage, activeTotalPages]);

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);

  async function handleDeletePersonnel(item: Personnel) {
    if (!confirm(`${item.full_name} personel kaydi silinsin mi?`)) return;

    try {
      await deletePersonnel(item.id);
      toast.success("Personel silindi.");
      qc.invalidateQueries({ queryKey: ["personnel"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Personel silinemedi.");
    }
  }

  async function handleReturn(item: AssignmentRecord) {
    try {
      await returnAssignment(item.id);
      toast.success("Zimmet iade edildi.");
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["personnel"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Iade islemi basarisiz.");
    }
  }

  function openExitReport(personnelId?: string) {
    setExitReportPersonnelId(personnelId || "");
    setExitReportModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Zimmet ve Personel Takibi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Personel kayitlarini yonetin, demirbaslari zimmetleyin ve iade surecini buradan takip edin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setPersonnelModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ContactRound size={16} />
            Personel Ekle
          </button>
          <button
            onClick={() => setAssignmentModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus size={16} />
            Zimmet Ata
          </button>
          <button
            onClick={() => openExitReport()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FileText size={16} />
            Isten Cikis Tutanagi
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.3fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Personeller</h2>
              <p className="text-xs text-slate-400">Toplam {personnel.length} kayit</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {personnelLoading ? (
              <p className="px-6 py-8 text-sm text-slate-400">Personeller yukleniyor...</p>
            ) : personnel.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-400">Kayitli personel bulunmuyor.</p>
            ) : (
              pagedPersonnel.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{item.full_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.department || "Departman yok"} - {item.title || "Unvan yok"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{item.email || item.employee_code || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openExitReport(item.id)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      title="Isten cikis tutanagi olustur"
                    >
                      Tutanak
                    </button>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      Aktif zimmet: {item.active_assignment_count}
                    </span>
                    <button
                      onClick={() => void handleDeletePersonnel(item)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {!personnelLoading && personnel.length > 0 && (
            <Pagination
              currentPage={personnelPage}
              totalItems={personnel.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPersonnelPage}
            />
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Aktif Zimmetler</h2>
              <p className="text-xs text-slate-400">{activeAssignments.length} aktif kayit</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {assignmentLoading ? (
              <p className="px-6 py-8 text-sm text-slate-400">Zimmetler yukleniyor...</p>
            ) : activeAssignments.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-400">Aktif zimmet bulunmuyor.</p>
            ) : (
              pagedActiveAssignments.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{item.asset_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.asset_code} - {item.personnel_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.department || "Departman yok"} - {new Date(item.assigned_at).toLocaleString("tr-TR")}
                    </p>
                    {item.note && <p className="mt-2 text-sm text-slate-600">{item.note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/print/assignment/${item.id}`)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Printer size={12} />
                      Form
                    </button>
                    <button
                      onClick={() => void handleReturn(item)}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      Iade Al
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {!assignmentLoading && activeAssignments.length > 0 && (
            <Pagination
              currentPage={activeAssignmentsPage}
              totalItems={activeAssignments.length}
              pageSize={PAGE_SIZE}
              onPageChange={setActiveAssignmentsPage}
            />
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Tum Zimmet Gecmisi</h2>
        </div>

        {assignmentLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Zimmet gecmisi yukleniyor...</div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Zimmet kaydi bulunmuyor.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Demirbas", "Personel", "Departman", "Zimmet Tarihi", "Durum"].map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedHistoryAssignments.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.asset_name}</p>
                    <p className="text-xs text-slate-400">{item.asset_code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.personnel_name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.department || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(item.assigned_at).toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.is_active ? "Aktif" : "Iade Edildi"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!assignmentLoading && assignments.length > 0 && (
          <Pagination
            currentPage={historyPage}
            totalItems={assignments.length}
            pageSize={PAGE_SIZE}
            onPageChange={setHistoryPage}
          />
        )}
      </section>

      {personnelModal && (
        <PersonnelModal
          onClose={() => setPersonnelModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["personnel"] });
            qc.invalidateQueries({ queryKey: ["logs"] });
            setPersonnelModal(false);
          }}
        />
      )}

      {assignmentModal && (
        <AssignmentModal
          onClose={() => setAssignmentModal(false)}
          onSaved={(created) => {
            qc.invalidateQueries({ queryKey: ["assignments"] });
            qc.invalidateQueries({ queryKey: ["assets"] });
            qc.invalidateQueries({ queryKey: ["personnel"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["logs"] });
            setAssignmentModal(false);
            navigate(`/print/assignment/${created.id}`);
          }}
        />
      )}

      {exitReportModal && (
        <ExitReportModal
          initialPersonnelId={exitReportPersonnelId}
          onClose={() => {
            setExitReportModal(false);
            setExitReportPersonnelId("");
          }}
          onSaved={(reportId) => {
            qc.invalidateQueries({ queryKey: ["logs"] });
            setExitReportModal(false);
            setExitReportPersonnelId("");
            navigate(`/print/exit-report/${reportId}`);
          }}
        />
      )}
    </div>
  );
}

function PersonnelModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PersonnelPayload>({
    full_name: "",
    email: "",
    department: "",
    title: "",
    location: "Genel Merkez",
    employee_code: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await createPersonnel(form);
      toast.success("Personel eklendi.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Personel eklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Yeni Personel" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <TextField
          label="Ad Soyad *"
          value={form.full_name || ""}
          onChange={(value) => setForm((current) => ({ ...current, full_name: value }))}
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="E-posta"
            value={form.email || ""}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
          />
          <TextField
            label="Personel Kodu"
            value={form.employee_code || ""}
            onChange={(value) => setForm((current) => ({ ...current, employee_code: value }))}
          />
          <TextField
            label="Departman"
            value={form.department || ""}
            onChange={(value) => setForm((current) => ({ ...current, department: value }))}
          />
          <TextField
            label="Unvan"
            value={form.title || ""}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          />
        </div>
        <ModalActions loading={loading} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function AssignmentModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (created: AssignmentRecord) => void;
}) {
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: getAssets,
  });
  const { data: personnel = [] } = useQuery({
    queryKey: ["personnel"],
    queryFn: getPersonnel,
  });

  const [assetId, setAssetId] = useState("");
  const [personnelId, setPersonnelId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const availableAssets = useMemo(
    () => assets.filter((item: Asset) => !item.assignment_id && item.status !== "Hurda"),
    [assets],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const created = await createAssignment({ asset_id: assetId, personnel_id: personnelId, note });
      toast.success("Zimmet atandi.");
      onSaved(created);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Zimmet atanamadi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Zimmet Ata" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Demirbas</label>
          <select
            value={assetId}
            onChange={(event) => setAssetId(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">Seciniz...</option>
            {availableAssets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.asset_id} - {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Personel</label>
          <select
            value={personnelId}
            onChange={(event) => setPersonnelId(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">Seciniz...</option>
            {personnel.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name} {item.department ? `- ${item.department}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Not</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <ModalActions loading={loading} onClose={onClose} saveLabel="Ata ve Formu Yazdir" />
      </form>
    </ModalShell>
  );
}

function ExitReportModal({
  initialPersonnelId,
  onClose,
  onSaved,
}: {
  initialPersonnelId?: string;
  onClose: () => void;
  onSaved: (reportId: string) => void;
}) {
  const { data: personnel = [] } = useQuery({
    queryKey: ["personnel"],
    queryFn: getPersonnel,
  });

  const [personnelId, setPersonnelId] = useState(initialPersonnelId || "");
  const [note, setNote] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const report = await createExitReport({
        personnel_id: personnelId,
        note,
        meeting_date: meetingDate ? new Date(`${meetingDate}T09:00:00`).toISOString() : undefined,
      });
      onSaved(report.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tutanak olusturulamadi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Isten Cikis Tutanagi" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Personel</label>
          <select
            value={personnelId}
            onChange={(event) => setPersonnelId(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">Seciniz...</option>
            {personnel.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name} {item.department ? `- ${item.department}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Tutanak Tarihi</label>
          <input
            type="date"
            value={meetingDate}
            onChange={(event) => setMeetingDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Not</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <ModalActions loading={loading} onClose={onClose} saveLabel="Olustur ve Yazdir" />
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}

function ModalActions({
  loading,
  onClose,
  saveLabel,
}: {
  loading: boolean;
  onClose: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
      >
        Iptal
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Kaydediliyor..." : saveLabel || "Kaydet"}
      </button>
    </div>
  );
}
