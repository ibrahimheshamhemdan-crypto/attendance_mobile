import * as SecureStore from "expo-secure-store";
import { ACCESS_TOKEN_KEY, API_URL } from "./client";

export type WebSocketStatus =
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED";

export interface AttendanceSocketEvent {
  type: "connection.state" | "attendance.update" | "session.state";
  state?: "CONNECTED";
  status?: string;
  session_id?: number;
  record?: unknown;
  location_snapshot?: unknown;
  timestamp?: string;
}

export interface AttendanceSocketConnection {
  readonly socket: WebSocket;
  readonly status: WebSocketStatus;
  readonly lastUpdateAt: string | null;
  close: () => void;
  reconnect: () => Promise<void>;
  onStatusChange: (listener: (status: WebSocketStatus) => void) => () => void;
  onEvent: (listener: (event: AttendanceSocketEvent) => void) => () => void;
}

export function websocketBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_WS_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (!API_URL)
    throw new Error(
      "EXPO_PUBLIC_API_URL must be configured before opening a WebSocket",
    );
  return API_URL.replace(/^http/, "ws")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, "");
}

export async function createAttendanceSocket(
  sessionId: number,
): Promise<AttendanceSocketConnection> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!token)
    throw new Error("An access token is required for the attendance WebSocket");

  let socket = new WebSocket(
    `${websocketBaseUrl()}/ws/sessions/${sessionId}/?token=${encodeURIComponent(token)}`,
  );
  let connectionStatus: WebSocketStatus = "CONNECTING";
  let lastUpdateAt: string | null = null;
  let manuallyClosed = false;
  const statusListeners = new Set<(status: WebSocketStatus) => void>();
  const eventListeners = new Set<(event: AttendanceSocketEvent) => void>();

  const setStatus = (status: WebSocketStatus) => {
    connectionStatus = status;
    statusListeners.forEach((listener) => listener(status));
  };

  const attach = (currentSocket: WebSocket) => {
    currentSocket.onopen = () => setStatus("CONNECTED");
    currentSocket.onmessage = (message) => {
      const event = JSON.parse(message.data) as AttendanceSocketEvent;
      lastUpdateAt = event.timestamp || new Date().toISOString();
      eventListeners.forEach((listener) => listener(event));
    };
    currentSocket.onerror = () => {
      if (!manuallyClosed) setStatus("RECONNECTING");
    };
    currentSocket.onclose = () =>
      setStatus(manuallyClosed ? "DISCONNECTED" : "RECONNECTING");
  };

  attach(socket);

  return {
    get socket() {
      return socket;
    },
    get status() {
      return connectionStatus;
    },
    get lastUpdateAt() {
      return lastUpdateAt;
    },
    close: () => {
      manuallyClosed = true;
      socket.close();
    },
    reconnect: async () => {
      manuallyClosed = false;
      setStatus("RECONNECTING");
      const refreshedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!refreshedToken)
        throw new Error(
          "An access token is required for the attendance WebSocket",
        );
      socket = new WebSocket(
        `${websocketBaseUrl()}/ws/sessions/${sessionId}/?token=${encodeURIComponent(refreshedToken)}`,
      );
      attach(socket);
    },
    onStatusChange: (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    onEvent: (listener) => {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
  };
}
