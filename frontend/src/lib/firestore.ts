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
  assigned_to?: string | null;
  assigned_department?: string | null;
  assignment_id?: string | null;
}

interface ApiChartDatum {
  label: string;
  value: number;
}

interface ApiTrendDatum {
  label: string;
  value: number;
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
  assigned_assets: number;
  low_stock_items: ApiStockItem[];
  recent_logs: ApiLog[];
  notifications: ApiNotification[];
  asset_status_breakdown: ApiChartDatum[];
  category_breakdown: ApiChartDatum[];
  maintenance_trend: ApiTrendDatum[];
  assignment_department_breakdown: ApiChartDatum[];
}

interface ApiPersonnel {
  id: string;
  full_name: string;
  email?: string | null;
  department?: string | null;
  title?: string | null;
  location: string;
  employee_code?: string | null;
  active_assignment_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ApiAssignmentRecord {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_code: string;
  personnel_id: string;
  personnel_name: string;
  department?: string | null;
  note?: string | null;
  assigned_by: string;
  assigned_at: string;
  returned_at?: string | null;
  returned_by?: string | null;
  is_active: boolean;
}

interface ApiReportSummary {
  total_personnel: number;
  active_assignments: number;
  unassigned_assets: number;
  exported_at: string;
}

interface ApiImportFileRecord {
  id: string;
  file_name: string;
  file_hash: string;
  uploaded_by: string;
  uploaded_at: string;
  total_rows: number;
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  warning_count: number;
  status: "completed" | "failed" | "duplicate_skipped";
  error_message?: string | null;
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
  assigned_to?: string;
  assigned_department?: string;
  assignment_id?: string;
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

export interface ChartDatum {
  label: string;
  value: number;
}

export interface TrendDatum {
  label: string;
  value: number;
}

export interface DashboardSummary {
  total_assets: number;
  broken_assets: number;
  open_maintenance: number;
  low_stock_count: number;
  assigned_assets: number;
  low_stock_items: StockItem[];
  recent_logs: Log[];
  notifications: Notification[];
  asset_status_breakdown: ChartDatum[];
  category_breakdown: ChartDatum[];
  maintenance_trend: TrendDatum[];
  assignment_department_breakdown: ChartDatum[];
}

export interface ImportResult {
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  warnings: string[];
}

export interface ImportFileRecord {
  id: string;
  file_name: string;
  file_hash: string;
  uploaded_by: string;
  uploaded_at: string;
  total_rows: number;
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  warning_count: number;
  status: "completed" | "failed" | "duplicate_skipped";
  error_message?: string;
}

interface ApiAdminUser {
  uid: string;
  email?: string | null;
  name?: string | null;
  is_admin: boolean;
  disabled: boolean;
  created_at?: string | null;
  last_sign_in_at?: string | null;
}

export interface AdminUser {
  uid: string;
  email?: string;
  name?: string;
  is_admin: boolean;
  disabled: boolean;
  created_at?: string;
  last_sign_in_at?: string;
}

export interface Personnel {
  id: string;
  full_name: string;
  email?: string;
  department?: string;
  title?: string;
  location: string;
  employee_code?: string;
  active_assignment_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface PersonnelPayload {
  full_name: string;
  email?: string;
  department?: string;
  title?: string;
  location?: string;
  employee_code?: string;
}

export interface AssignmentRecord {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_code: string;
  personnel_id: string;
  personnel_name: string;
  department?: string;
  note?: string;
  assigned_by: string;
  assigned_at: string;
  returned_at?: string;
  returned_by?: string;
  is_active: boolean;
}

export interface AssignmentPayload {
  asset_id: string;
  personnel_id: string;
  note?: string;
  assigned_at?: string;
}

export interface ReportSummary {
  total_personnel: number;
  active_assignments: number;
  unassigned_assets: number;
  exported_at: string;
}

async function getAuthToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Oturum bulunamadi.");
  }

  return user.getIdToken(forceRefresh);
}

async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  let message = `${fallback} (HTTP ${response.status}).`;
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as { detail?: string };
      message = data.detail || message;
    } else {
      const text = (await response.text()).trim();
      if (text) {
        message = text.slice(0, 240);
      }
    }
  } catch {
    // no-op
  }
  return message;
}

async function apiRequest<T>(path: string, init?: RequestInit, forceRefresh = false): Promise<T> {
  const token = await getAuthToken(forceRefresh);
  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error("Sunucuya baglanilamadi. Internet baglantinizi kontrol edip tekrar deneyin.");
  }

  if (!response.ok) {
    if (response.status === 401 && !forceRefresh) {
      return apiRequest<T>(path, init, true);
    }
    const message = await readApiErrorMessage(response, "Istek basarisiz");
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function apiDownload(path: string, forceRefresh = false): Promise<Blob> {
  const token = await getAuthToken(forceRefresh);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("Sunucuya baglanilamadi. Internet baglantinizi kontrol edip tekrar deneyin.");
  }

  if (!response.ok) {
    if (response.status === 401 && !forceRefresh) {
      return apiDownload(path, true);
    }
    const message = await readApiErrorMessage(response, "Dosya indirilemedi");
    throw new Error(message);
  }

  return response.blob();
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
    assigned_to: item.assigned_to ?? undefined,
    assigned_department: item.assigned_department ?? undefined,
    assignment_id: item.assignment_id ?? undefined,
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

function mapAdminUser(item: ApiAdminUser): AdminUser {
  return {
    uid: item.uid,
    email: item.email ?? undefined,
    name: item.name ?? undefined,
    is_admin: item.is_admin,
    disabled: item.disabled,
    created_at: item.created_at ?? undefined,
    last_sign_in_at: item.last_sign_in_at ?? undefined,
  };
}

function mapPersonnel(item: ApiPersonnel): Personnel {
  return {
    id: item.id,
    full_name: item.full_name,
    email: item.email ?? undefined,
    department: item.department ?? undefined,
    title: item.title ?? undefined,
    location: item.location,
    employee_code: item.employee_code ?? undefined,
    active_assignment_count: item.active_assignment_count,
    created_at: item.created_at ?? undefined,
    updated_at: item.updated_at ?? undefined,
  };
}

function mapAssignment(item: ApiAssignmentRecord): AssignmentRecord {
  return {
    id: item.id,
    asset_id: item.asset_id,
    asset_name: item.asset_name,
    asset_code: item.asset_code,
    personnel_id: item.personnel_id,
    personnel_name: item.personnel_name,
    department: item.department ?? undefined,
    note: item.note ?? undefined,
    assigned_by: item.assigned_by,
    assigned_at: item.assigned_at,
    returned_at: item.returned_at ?? undefined,
    returned_by: item.returned_by ?? undefined,
    is_active: item.is_active,
  };
}

function mapImportFile(item: ApiImportFileRecord): ImportFileRecord {
  return {
    id: item.id,
    file_name: item.file_name,
    file_hash: item.file_hash,
    uploaded_by: item.uploaded_by,
    uploaded_at: item.uploaded_at,
    total_rows: item.total_rows,
    imported_count: item.imported_count,
    updated_count: item.updated_count,
    skipped_count: item.skipped_count,
    warning_count: item.warning_count,
    status: item.status,
    error_message: item.error_message ?? undefined,
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

export async function getAssetImportHistory(limitN = 50, mineOnly = true): Promise<ImportFileRecord[]> {
  const items = await apiRequest<ApiImportFileRecord[]>(
    `/imports/assets/history?limit=${limitN}&mine_only=${mineOnly}`,
  );
  return items.map(mapImportFile);
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
    assigned_assets: data.assigned_assets,
    low_stock_items: data.low_stock_items.map(mapStock),
    recent_logs: data.recent_logs,
    notifications: data.notifications,
    asset_status_breakdown: data.asset_status_breakdown,
    category_breakdown: data.category_breakdown,
    maintenance_trend: data.maintenance_trend,
    assignment_department_breakdown: data.assignment_department_breakdown,
  };
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const items = await apiRequest<ApiAdminUser[]>("/admin/users");
  return items.map(mapAdminUser);
}

export async function updateAdminRole(uid: string, isAdmin: boolean): Promise<AdminUser> {
  const item = await apiRequest<ApiAdminUser>(`/admin/users/${uid}/admin`, {
    method: "PATCH",
    body: JSON.stringify({ is_admin: isAdmin }),
  });
  return mapAdminUser(item);
}

export async function getPersonnel(): Promise<Personnel[]> {
  const items = await apiRequest<ApiPersonnel[]>("/personnel");
  return items.map(mapPersonnel);
}

export async function createPersonnel(data: PersonnelPayload): Promise<Personnel> {
  const item = await apiRequest<ApiPersonnel>("/personnel", {
    method: "POST",
    body: JSON.stringify({
      full_name: data.full_name,
      email: data.email || null,
      department: data.department || null,
      title: data.title || null,
      location: data.location || "Genel Merkez",
      employee_code: data.employee_code || null,
    }),
  });
  return mapPersonnel(item);
}

export async function updatePersonnel(id: string, data: Partial<PersonnelPayload>): Promise<Personnel> {
  const item = await apiRequest<ApiPersonnel>(`/personnel/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      full_name: data.full_name,
      email: data.email,
      department: data.department,
      title: data.title,
      location: data.location,
      employee_code: data.employee_code,
    }),
  });
  return mapPersonnel(item);
}

export async function deletePersonnel(id: string): Promise<void> {
  await apiRequest<void>(`/personnel/${id}`, { method: "DELETE" });
}

export async function getAssignments(activeOnly = false): Promise<AssignmentRecord[]> {
  const items = await apiRequest<ApiAssignmentRecord[]>(`/assignments?active_only=${activeOnly}`);
  return items.map(mapAssignment);
}

export async function createAssignment(data: AssignmentPayload): Promise<AssignmentRecord> {
  const item = await apiRequest<ApiAssignmentRecord>("/assignments", {
    method: "POST",
    body: JSON.stringify({
      asset_id: data.asset_id,
      personnel_id: data.personnel_id,
      note: data.note || null,
      assigned_at: data.assigned_at || null,
    }),
  });
  return mapAssignment(item);
}

export async function returnAssignment(id: string, note?: string): Promise<AssignmentRecord> {
  const item = await apiRequest<ApiAssignmentRecord>(`/assignments/${id}/return`, {
    method: "PATCH",
    body: JSON.stringify({ note: note || null }),
  });
  return mapAssignment(item);
}

export async function getReportSummary(): Promise<ReportSummary> {
  return apiRequest<ApiReportSummary>("/reports/summary");
}

export async function downloadExcelReport(): Promise<Blob> {
  return apiDownload("/reports/export.xlsx");
}

export async function downloadAssignmentsCsv(): Promise<Blob> {
  return apiDownload("/reports/assignments.csv");
}
