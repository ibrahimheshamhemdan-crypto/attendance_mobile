import { AxiosError } from "axios";
import { ApiErrorCode } from "#src/types";

export class BackendApiError extends Error {
  readonly status?: number;
  readonly code?: ApiErrorCode | string;
  readonly details: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "BackendApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function toBackendApiError(error: unknown): BackendApiError {
  if (error instanceof BackendApiError) return error;
  const axiosError = error as AxiosError<{ detail?: string; code?: string }>;
  const payload = axiosError.response?.data;
  return new BackendApiError(
    payload?.detail || axiosError.message || "Request failed",
    {
      status: axiosError.response?.status,
      code: payload?.code,
      details: payload,
    },
  );
}

export async function request<T>(
  operation: () => Promise<{ data: T }>,
): Promise<T> {
  try {
    return (await operation()).data;
  } catch (error) {
    throw toBackendApiError(error);
  }
}
