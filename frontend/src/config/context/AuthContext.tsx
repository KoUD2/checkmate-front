"use client";

import authService from "@/services/auth.service";
import { createContext, ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  freeChecksLeft: number;
  vkId: string | null;
  telegramId: string | null;
  yandexId: string | null;
  socialBonusGranted: boolean;
  subscription?: {
    isActive: boolean;
    expiresAt: string | null;
  } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    referredByCode?: string,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = new Set(["/login", "/register"]);
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

async function fetchMe(accessToken: string): Promise<User | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.user ?? null;
  } catch {
    return null;
  }
}

function getAccessTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        let token = getAccessTokenFromCookie();

        if (!token) {
          // Try silent refresh
          const refreshRes = await authService.refreshToken().catch(() => null);
          if (refreshRes?.accessToken) {
            token = refreshRes.accessToken;
          }
        }

        if (token) {
          const me = await fetchMe(token);
          if (me) {
            setUser(me);
            if (PUBLIC_PATHS.has(pathname)) router.push("/");
            return;
          }
        }

        // Not authenticated
        setUser(null);
        if (!PUBLIC_PATHS.has(pathname) && pathname !== "/" && pathname !== "/create-work" && pathname !== "/subscribe" && !pathname.startsWith("/payment") && !pathname.startsWith("/resources")) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh token every 25 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = getAccessTokenFromCookie();
      if (!token) return;
      try {
        await authService.refreshToken();
      } catch {
        // ignore
      }
    }, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const signup = async (
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    referredByCode?: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.signup(email, firstName, lastName, password, undefined, referredByCode);
      if (data.user) setUser(data.user);
      if (typeof window !== "undefined" && Array.isArray((window as any)._tmr)) {
        (window as any)._tmr.push({ type: "reachGoal", id: "3755767", goal: "registration" });
      }
      window.location.href = "/";
    } catch (err: unknown) {
      const msg = (err as Error).message || "Ошибка регистрации";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      if (data.user) setUser(data.user);
      window.location.href = "/";
    } catch (err: unknown) {
      const msg = (err as Error).message || "Неверный email или пароль";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    router.push("/login");
  };

  const refreshUser = async () => {
    const token = getAccessTokenFromCookie();
    if (!token) return;
    const me = await fetchMe(token);
    if (me) setUser(me);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signup,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
