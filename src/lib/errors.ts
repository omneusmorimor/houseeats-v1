const FALLBACK = "Something went wrong. Please try again.";

export function errorMessage(error: unknown, fallback = FALLBACK) {
  if (!error) return fallback;
  if (typeof error === "string") return error || fallback;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message ? message : fallback;
}

export function firstErrorMessage(errors: unknown[], fallback = FALLBACK) {
  const failure = errors.find(Boolean);
  return failure ? errorMessage(failure, fallback) : "";
}

export function reportError(context: string, error: unknown) {
  console.error(`[houseeats] ${context}:`, error);
  return errorMessage(error);
}
