import { AlertTriangle, RefreshCcw } from "lucide-react";

import { getErrorMessage, isAuthError, isQuotaError } from "@/lib/query-errors";

export function QueryErrorState({
  error,
  onRetry,
  title = "Veri su anda yuklenemiyor",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const message = getErrorMessage(error);
  const quotaError = isQuotaError(error);
  const authError = isAuthError(error);

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-red-100 p-2 text-red-600">
          <AlertTriangle size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-900">{title}</p>
          <p className="mt-1 text-sm text-red-800">{message}</p>

          {quotaError && (
            <p className="mt-3 text-xs text-red-700">
              Firestore tarafinda gecici kota siniri doldugu icin liste ve import islemleri durabilir. Kota yenilendiginde
              veriler tekrar gorunur.
            </p>
          )}

          {authError && (
            <p className="mt-3 text-xs text-red-700">
              Oturum yenilenemedi. Cikis yapip tekrar giris yapmaniz gerekebilir.
            </p>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <RefreshCcw size={14} />
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
