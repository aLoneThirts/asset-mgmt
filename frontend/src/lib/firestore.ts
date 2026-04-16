import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, limit, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface Asset {
  id: string; name: string; serial_no?: string; category?: string;
  brand?: string; model?: string; status: string; location: string;
  added_at?: string; imported_by?: string;
}

export interface MaintenanceRecord {
  id: string; asset_id: string; asset_name: string;
  description: string; reported_by_email: string; date: string; status: string;
}

export interface StockItem {
  id: string; name: string; quantity: number; min_quantity: number;
  unit?: string; category?: string; low_stock: boolean;
}

export interface Log {
  id: string; user: string; action: string; detail: string; date: string;
}

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function tsToStr(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  return String(val);
}

// ─── Log ─────────────────────────────────────────────────────────────────────

export async function addLog(userEmail: string, action: string, detail: string) {
  await addDoc(collection(db, "logs"), {
    user: userEmail, action, detail,
    date: serverTimestamp(),
  });
}

export async function getLogs(limitN = 100): Promise<Log[]> {
  const q = query(collection(db, "logs"), orderBy("date", "desc"), limit(limitN));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id, ...d.data(),
    date: tsToStr(d.data().date),
  })) as Log[];
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export async function getAssets(): Promise<Asset[]> {
  const snap = await getDocs(collection(db, "assets"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Asset[];
}

export async function createAsset(data: Omit<Asset, "id">, userEmail: string): Promise<Asset> {
  const payload = { ...data, location: "Genel Merkez", added_at: new Date().toISOString(), imported_by: userEmail };
  const ref = await addDoc(collection(db, "assets"), payload);
  await addLog(userEmail, "demirbaş_eklendi", `${data.name} eklendi.`);
  return { id: ref.id, ...payload };
}

export async function updateAsset(id: string, data: Partial<Asset>, userEmail: string) {
  await updateDoc(doc(db, "assets", id), data);
  await addLog(userEmail, "demirbaş_güncellendi", `${data.name ?? id} güncellendi.`);
}

export async function deleteAsset(id: string, name: string, userEmail: string) {
  await deleteDoc(doc(db, "assets", id));
  await addLog(userEmail, "demirbaş_silindi", `${name} silindi.`);
}

// ─── Toplu import (Excel) ────────────────────────────────────────────────────

export async function importAssets(rows: Omit<Asset, "id">[], userEmail: string): Promise<number> {
  let count = 0;
  for (const row of rows) {
    const id = row.serial_no
      ? row.serial_no.replace(/\s+/g, "_").toUpperCase()
      : doc(collection(db, "assets")).id;
    await setDoc(doc(db, "assets", id), { ...row, location: "Genel Merkez" }, { merge: true });
    count++;
  }
  await addLog(userEmail, "excel_import", `${count} demirbaş aktarıldı.`);
  return count;
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export async function getMaintenance(): Promise<MaintenanceRecord[]> {
  const q = query(collection(db, "maintenance"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id, ...d.data(),
    date: tsToStr(d.data().date),
  })) as MaintenanceRecord[];
}

export async function createMaintenance(
  assetId: string, assetName: string, description: string, userEmail: string
): Promise<MaintenanceRecord> {
  const data = {
    asset_id: assetId, asset_name: assetName, description,
    reported_by_email: userEmail,
    date: serverTimestamp(),
    status: "Açık",
  };
  const ref = await addDoc(collection(db, "maintenance"), data);
  await updateDoc(doc(db, "assets", assetId), { status: "Arızalı" });
  await addLog(userEmail, "arıza_kaydı_açıldı", `${assetName}: ${description}`);
  return { id: ref.id, ...data, date: new Date().toISOString() } as MaintenanceRecord;
}

export async function updateMaintenance(id: string, status: string, assetId: string, userEmail: string) {
  await updateDoc(doc(db, "maintenance", id), { status });
  if (status === "Çözüldü") {
    await updateDoc(doc(db, "assets", assetId), { status: "Aktif" });
  }
  await addLog(userEmail, "arıza_güncellendi", `ID: ${id} → ${status}`);
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export async function getStock(): Promise<StockItem[]> {
  const snap = await getDocs(collection(db, "stock"));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id, ...data,
      low_stock: (data.quantity ?? 0) <= (data.min_quantity ?? 5),
    };
  }) as StockItem[];
}

export async function createStock(data: Omit<StockItem, "id" | "low_stock">, userEmail: string) {
  const payload = { ...data, low_stock: data.quantity <= data.min_quantity };
  const ref = await addDoc(collection(db, "stock"), payload);
  await addLog(userEmail, "stok_eklendi", `${data.name} eklendi. Miktar: ${data.quantity}`);
  return { id: ref.id, ...payload };
}

export async function updateStock(id: string, data: Partial<StockItem>, current: StockItem, userEmail: string) {
  const qty    = data.quantity    ?? current.quantity;
  const minQty = data.min_quantity ?? current.min_quantity;
  const payload = { ...data, low_stock: qty <= minQty };
  await updateDoc(doc(db, "stock", id), payload);
  await addLog(userEmail, "stok_güncellendi", `${current.name} güncellendi.`);
}

export async function deleteStock(id: string, name: string, userEmail: string) {
  await deleteDoc(doc(db, "stock", id));
  await addLog(userEmail, "stok_silindi", `${name} silindi.`);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboard() {
  const [assets, maintenance, stock, logs] = await Promise.all([
    getAssets(),
    getMaintenance(),
    getStock(),
    getLogs(10),
  ]);

  return {
    total_assets:    assets.length,
    broken_assets:   assets.filter(a => a.status === "Arızalı").length,
    open_maintenance: maintenance.filter(m => m.status !== "Çözüldü").length,
    low_stock_count: stock.filter(s => s.low_stock).length,
    low_stock_items: stock.filter(s => s.low_stock),
    recent_logs:     logs,
  };
}
