import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import * as SecureStore from "expo-secure-store";

export const ACCESS_TOKEN_KEY = "bio_access_token";
export const REFRESH_TOKEN_KEY = "bio_refresh_token";
// don't forget to make the fall back to horus.socail
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://horus.social/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      request.url?.includes("/auth/token/refresh/")
    ) {
      return Promise.reject(error);
    }

    request._retry = true;
    const refresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refresh) return Promise.reject(error);

    try {
      const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
        refresh,
      });
      const { access, refresh: rotatedRefresh } = response.data as {
        access: string;
        refresh?: string;
      };
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
      if (rotatedRefresh)
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, rotatedRefresh);
      request.headers.Authorization = `Bearer ${access}`;
      return api(request);
    } catch (refreshError) {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      return Promise.reject(refreshError);
    }
  },
);

export function unwrap<T>(response: { data: T }): T {
  return response.data;
}

export { authApi } from "./auth";
export { attendanceApi } from "./attendance";
export { studentApi } from "./students";
