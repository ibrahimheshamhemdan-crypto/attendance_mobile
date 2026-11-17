import { toBackendApiError } from "./errors";
import { pageResults, PaginatedResponse } from "./pagination";
import { websocketBaseUrl } from "./websocket";

export function runApiContractChecks(): void {
  const page: PaginatedResponse<{ id: number }> = {
    count: 1,
    next: null,
    previous: null,
    results: [{ id: 1 }],
  };
  if (pageResults(page)[0].id !== 1)
    throw new Error("Pagination contract failed");

  const error = toBackendApiError({
    response: {
      status: 400,
      data: {
        detail: "locked",
        code: "DEVICE_REGISTRATION_LOCKED_ACTIVE_SESSION",
      },
    },
    message: "request failed",
  });
  if (error.code !== "DEVICE_REGISTRATION_LOCKED_ACTIVE_SESSION")
    throw new Error("Error code contract failed");

  const wsUrl = websocketBaseUrl();
  if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://"))
    throw new Error("WebSocket URL contract failed");
}
