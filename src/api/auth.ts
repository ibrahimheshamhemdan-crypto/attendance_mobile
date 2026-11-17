import { api } from "./client";
import { request } from "./errors";
import { AuthTokens, AuthUser, LoginResponse, User } from "#src/types";

export const authApi = {
  login: (email: string, password: string, deviceFingerprint?: string) =>
    request<LoginResponse>(() =>
      api.post("/auth/login/", {
        email,
        password,
        ...(deviceFingerprint ? { device_fingerprint: deviceFingerprint } : {}),
      }),
    ),

  deviceLoginChallenge: (deviceFingerprint: string) =>
    request<{ challenge: string }>(() =>
      api.post("/auth/device-login/challenge/", {
        device_fingerprint: deviceFingerprint,
      }),
    ),

  deviceLoginVerify: (
    deviceFingerprint: string,
    challenge: string,
    signature: string,
  ) =>
    request<AuthTokens>(() =>
      api.post("/auth/device-login/verify/", {
        device_fingerprint: deviceFingerprint,
        challenge,
        signature,
      }),
    ),

  me: () => request<User>(() => api.get("/auth/me/")),

  updateMe: (
    payload: Partial<
      Pick<AuthUser, "email" | "first_name" | "last_name" | "is_active">
    >,
  ) => request<User>(() => api.patch("/auth/me/", payload)),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ detail: string }>(() =>
      api.post("/auth/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
      }),
    ),

  logout: (refresh?: string) =>
    request<{ detail: string }>(() =>
      api.post("/auth/logout/", refresh ? { refresh } : {}),
    ),
};
