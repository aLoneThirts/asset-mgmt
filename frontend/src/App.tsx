import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

const LoginPage       = lazy(() => import("@/pages/Login").then(m => ({ default: m.LoginPage })));
const DashboardPage   = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.DashboardPage })));
const AssetsPage      = lazy(() => import("@/pages/Assets").then(m => ({ default: m.AssetsPage })));
const MaintenancePage = lazy(() => import("@/pages/Maintenance").then(m => ({ default: m.MaintenancePage })));
const StockPage       = lazy(() => import("@/pages/Stock").then(m => ({ default: m.StockPage })));
const ImportPage      = lazy(() => import("@/pages/ImportExcel").then(m => ({ default: m.ImportPage })));
const LogsPage        = lazy(() => import("@/pages/Logs").then(m => ({ default: m.LogsPage })));
const AdminUsersPage  = lazy(() => import("@/pages/AdminUsers").then(m => ({ default: m.AdminUsersPage })));
const AssignmentsPage = lazy(() => import("@/pages/Assignments").then(m => ({ default: m.AssignmentsPage })));
const ReportsPage     = lazy(() => import("@/pages/Reports").then(m => ({ default: m.ReportsPage })));

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/logn" element={<Navigate to="/login" replace />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard"   element={<DashboardPage />} />
                  <Route path="/assets"      element={<AssetsPage />} />
                  <Route path="/maintenance" element={<MaintenancePage />} />
                  <Route path="/stock"       element={<StockPage />} />
                  <Route path="/assignments" element={<AssignmentsPage />} />
                  <Route path="/import"      element={<ImportPage />} />
                  <Route path="/reports"     element={<ReportsPage />} />
                  <Route path="/logs"        element={<LogsPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: "14px" },
          success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
    </QueryClientProvider>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
