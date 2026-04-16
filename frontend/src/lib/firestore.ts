import { auth } from "@/lib/firebase";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export type AssetStatus = "Aktif" | "Arizali" | "Hurda";
export type MaintenanceStatus = "Acik" | "Devam Ediyor" | "Cozuldu";

interface ApiAsset {
  id: string;
  asset_id: string;
  name: string;
  serial_number?: string | null;
  category?: string | null;
  brand_model?: string | null;
  status: AssetStatus;
  location: string;
  added_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
}

interface ApiMaintenanceRecord {
  id: string;
  fault_id: string;
  asset_id: string;
  asset_name: string;
  description: string;
  reported_by: string;
  date: string;
  status: MaintenanceStatus;
}

interface ApiStockItem {
  id: string;
  name: string;
  category?: string | null;
  quantity: number;
  min_quantity: number;
  unit: string;
  low_stock: boolean;
  updated_at?: string | null;
}

interface ApiLog {
  id: string;
  user: string;
  action: string;
  detail: string;
  date: string;
}

interface ApiNotification {
  id: string;
  type: "stock" | "fault";
  title: string;
  detail: string;
}

interface ApiDashboard {
  total_assets: number;
  broken_assets: number;
  open_maintenance: number;
  low_stock_count: number;
  low_stock_items: ApiStockItem[];
  recent_logs: ApiLog[];
  notifications: ApiNotification[];
}

export interface Asset {
  id: string;
  asset_id: string;
  name: string;
  serial_no?: string;
  category?: string;
  brand_model?: string;
  status: AssetStatus;
  location: string;
  added_at?: string;
  created_by?: string;
  updated_at?: string;
}

export interface AssetPayload {
  asset_id: string;
  name: string;
  serial_no?: string;
  category?: string;
  brand_model?: string;
  status: AssetStatus;
  added_at?: string;
}

export interface MaintenanceRecord {
  id: string;
  fault_id: string;
  asset_id: string;
  asset_name: string;
  description: string;
  reported_by_email: string;
  date: string;
  status: MaintenanceStatus;
}

export interface StockItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  min_quantity: number;
  unit?: string;
  low_stock: boolean;
  updated_at?: string;
}

export interface Log {
  id: string;
  user: string;
  action: string;
  detail: string;
  date: string;
}

export interface Notification {
  id: string;
  type: "stock" | "fault";
  title: string;
  detail: string;
}

export interface DashboardSummary {
  total_assets: number;
  broken_assets: number;
  open_maintenance: number;
  low_stock_count: number;
  low_stock_items: StockItem[];
  recent_logs: Log[];
  notifications: Notification[];
}

export interface ImportResult {
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  warnings: string[];
}

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Oturum bulunamadi.");
  }

  return user.getIdToken(true);
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = "Bir hata olustu.";
    try {
      const data = (await response.json()) as { detail?: string };
      message = data.detail || message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function mapAsset(item: ApiAsset): Asset {
  return {
    id: item.id,
    asset_id: item.asset_id,
    name: item.name,
    serial_no: item.serial_number ?? undefined,
    category: item.category ?? undefined,
    brand_model: item.brand_model ?? undefined,
    status: item.status,
    location: item.location,
    added_at: item.added_at ?? undefined,
    created_by: item.created_by ?? undefined,
    updated_at: item.updated_at ?? undefined,
  };
}

function mapMaintenance(item: ApiMaintenanceRecord): MaintenanceRecord {
  return {
    id: item.id,
    fault_id: item.fault_id,
    asset_id: item.asset_id,
    asset_name: item.asset_name,
    description: item.description,
    reported_by_email: item.reported_by,
    date: item.date,
    status: item.status,
  };
}

function mapStock(item: ApiStockItem): StockItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category ?? undefined,
    quantity: item.quantity,
    min_quantity: item.min_quantity,
    unit: item.unit,
    low_stock: item.low_stock,
    updated_at: item.updated_at ?? undefined,
  };
}

export async function logSession(event: "login" | "register") {
  await apiRequest<void>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ event }),
  });
}

export async function getAssets(): Promise<Asset[]> {
  const items = await apiRequest<ApiAsset[]>("/assets");
  return items.map(mapAsset);
}

export async function createAsset(data: AssetPayload): Promise<Asset> {
  const item = await apiRequest<ApiAsset>("/assets", {
    method: "POST",
    body: JSON.stringify({
      asset_id: data.asset_id,
      name: data.name,
      serial_number: data.serial_no || null,
      category: data.category || null,
      brand_model: data.brand_model || null,
      status: data.status,
      location: "Genel Merkez",
      added_at: data.added_at || null,
    }),
  });
  return mapAsset(item);
}

export async function updateAsset(id: string, data: Partial<AssetPayload>): Promise<Asset> {
  const item = await apiRequest<ApiAsset>(`/assets/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: data.name,
      serial_number: data.serial_no,
      category: data.category,
      brand_model: data.brand_model,
      status: data.status,
    }),
  });
  return mapAsset(item);
}

export async function deleteAsset(id: string): Promise<void> {
  await apiRequest<void>(`/assets/${id}`, { method: "DELETE" });
}

export async function uploadAssetExcel(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<ImportResult>("/imports/assets", {
    method: "POST",
    body: formData,
  });
}

export async function getMaintenance(): Promise<MaintenanceRecord[]> {
  const items = await apiRequest<ApiMaintenanceRecord[]>("/maintenance");
  return items.map(mapMaintenance);
}

export async function createMaintenance(assetId: string, description: string): Promise<MaintenanceRecord> {
  const item = await apiRequest<ApiMaintenanceRecord>("/maintenance", {
    method: "POST",
    body: JSON.stringify({ asset_id: assetId, description }),
  });
  return mapMaintenance(item);
}

export async function updateMaintenance(id: string, status: MaintenanceStatus): Promise<MaintenanceRecord> {
  const item = await apiRequest<ApiMaintenanceRecord>(`/maintenance/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return mapMaintenance(item);
}

export async function getStock(): Promise<StockItem[]> {
  const items = await apiRequest<ApiStockItem[]>("/stock");
  return items.map(mapStock);
}

export async function createStock(data: Omit<StockItem, "id" | "low_stock" | "updated_at">): Promise<StockItem> {
  const item = await apiRequest<ApiStockItem>("/stock", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return mapStock(item);
}

export async function updateStock(
  id: string,
  data: Partial<Omit<StockItem, "id" | "low_stock" | "updated_at">>,
): Promise<StockItem> {
  const item = await apiRequest<ApiStockItem>(`/stock/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return mapStock(item);
}

export async function deleteStock(id: string): Promise<void> {
  await apiRequest<void>(`/stock/${id}`, { method: "DELETE" });
}

export async function getLogs(limitN = 100): Promise<Log[]> {
  return apiRequest<ApiLog[]>(`/logs?limit=${limitN}`);
}

export async function getDashboard(): Promise<DashboardSummary> {
  const data = await apiRequest<ApiDashboard>("/dashboard");
  return {
    total_assets: data.total_assets,
    broken_assets: data.broken_assets,
    open_maintenance: data.open_maintenance,
    low_stock_count: data.low_stock_count,
    low_stock_items: data.low_stock_items.map(mapStock),
    recent_logs: data.recent_logs,
    notifications: data.notifications,
  };
}
