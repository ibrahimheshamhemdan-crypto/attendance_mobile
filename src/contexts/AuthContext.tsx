/**
 * AuthContext — manages login state.
 *
 * Tokens stored in SecureStore.
 * User info derived from JWT + /me endpoint.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { authApi } from "#src/api/auth";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "#src/api/client";
import { AuthUser, Role } from "#src/types";

const MOBILE_ROLES: Role[] = ["DOCTOR", "TEACHING_ASSISTANT", "STUDENT"];

function assertMobileRole(user: AuthUser): AuthUser {
  if (!MOBILE_ROLES.includes(user.role)) {
    throw new Error("This account does not have a supported mobile role.");
  }
  return user;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    fingerprint?: string,
  ) => Promise<void>;
  deviceLogin: (
    fingerprint: string,
    challenge: string,
    signature: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on app start
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (token) {
          const res = await authApi.me();
          setUser(assertMobileRole(res));
        }
      } catch (err) {
        try {
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        } catch {}
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (
    email: string,
    password: string,
    fingerprint?: string,
  ) => {
    const res = await authApi.login(email, password, fingerprint);
    const { access, refresh, user: userData } = res;
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    } catch (e) {
      console.warn("Failed to save auth tokens to SecureStore:", e);
    }
    setUser(assertMobileRole(userData));
  };

  const deviceLogin = async (
    fingerprint: string,
    challenge: string,
    signature: string,
  ) => {
    const res = await authApi.deviceLoginVerify(
      fingerprint,
      challenge,
      signature,
    );
    const { access, refresh } = res;
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    } catch (e) {
      console.warn("Failed to save auth tokens to SecureStore:", e);
    }
    const meRes = await authApi.me();
    setUser(assertMobileRole(meRes));
  };

  const logout = async () => {
    try {
      const refresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refresh) await authApi.logout(refresh);
    } catch {}
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {}
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, isLoading, login, deviceLogin, logout }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
