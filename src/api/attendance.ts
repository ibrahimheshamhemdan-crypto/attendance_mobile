import { api } from "./client";
import { request } from "./errors";
import { PaginatedResponse } from "./pagination";
import {
  AdHocSessionStartPayload,
  AttendanceRecord,
  AttendanceResult,
  AttendanceSession,
  CheckInPayload,
  Challenge,
  ManualCorrection,
  OpenOccurrencePayload,
  SessionStatus,
  TodayWork,
} from "#src/types";

export const attendanceApi = {
  today: (params?: { search?: string; session_type?: string; status?: string }) =>
    request<TodayWork[]>(() => api.get("/attendance/today/", { params })),

  openOccurrence: (occurrenceId: number, payload: OpenOccurrencePayload = {}) =>
    request<AttendanceSession>(() =>
      api.post(`/attendance/occurrences/${occurrenceId}/open/`, payload),
    ),

  startAdHocSession: (payload: AdHocSessionStartPayload) =>
    request<AttendanceSession>(() =>
      api.post("/attendance/occurrences/ad-hoc/start/", payload),
    ),

  sessions: (params?: { status?: SessionStatus; search?: string; session_type?: string }) =>
    request<PaginatedResponse<AttendanceSession>>(() =>
      api.get("/attendance/sessions/", {
        params: typeof params === "string" ? { status: params } : params,
      }),
    ),

  closeSession: (sessionId: number) =>
    request<{ detail: string }>(() =>
      api.post(`/attendance/sessions/${sessionId}/close/`),
    ),

  sessionRecords: (
    sessionId: number,
    params?: { search?: string; status?: string; distance_filter?: string; page_size?: number },
  ) =>
    request<PaginatedResponse<AttendanceRecord>>(() =>
      api.get(`/attendance/sessions/${sessionId}/records/`, {
        params: { page_size: 500, ...params },
      }),
    ),

  manualCorrection: (sessionId: number, correction: ManualCorrection) =>
    request<AttendanceRecord>(() =>
      api.post(`/attendance/sessions/${sessionId}/override/`, correction),
    ),

  requestChallenge: (sessionId: number, deviceId: number) =>
    request<Challenge>(() =>
      api.post(`/attendance/sessions/${sessionId}/challenge/`, {
        device_id: deviceId,
      }),
    ),

  checkIn: (sessionId: number, payload: CheckInPayload) =>
    request<AttendanceResult>(() =>
      api.post(`/attendance/sessions/${sessionId}/checkin/`, payload),
    ),

  history: () =>
    request<PaginatedResponse<AttendanceRecord>>(() =>
      api.get("/attendance/history/"),
    ),
};
