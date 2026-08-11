import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { ApiError, apiRequest } from "@/lib/apiClient";
import type { LoginPayload, RegisterPayload, TokenResponse, UserPublic } from "@/types/auth";

interface AuthContextValue {
  user: UserPublic | null;
  token: string | null;
  status: "idle" | "authenticated";
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Session state lives in memory only (per architecture.md's Feature 1 open
 * decision: "Begin with a short-lived access token in memory"). That means a
 * page refresh currently signs the user out -- persistent sessions (an
 * HttpOnly refresh cookie) are an explicitly deferred decision, not an
 * oversight. Wire that up before this ships past a local demo.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserPublic | null>(null);

  const applySession = useCallback((session: TokenResponse) => {
    setToken(session.access_token);
    setUser(session.user);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const session = await apiRequest<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: payload,
      });
      applySession(session);
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const session = await apiRequest<TokenResponse>("/api/v1/auth/register", {
        method: "POST",
        body: payload,
      });
      applySession(session);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status: token ? "authenticated" : "idle",
      login,
      register,
      logout,
    }),
    [user, token, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export { ApiError };
