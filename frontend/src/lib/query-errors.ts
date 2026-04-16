export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Bir hata olustu. Lutfen tekrar deneyin.";
}

export function isQuotaError(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes("firestore kotasi asildi");
}

export function isAuthError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("invalid or expired token") ||
    message.includes("oturum bulunamadi") ||
    message.includes("unauthorized") ||
    message.includes("401")
  );
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isQuotaError(error) || isAuthError(error)) {
    return false;
  }

  return failureCount < 1;
}
