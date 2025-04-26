"use client";

import {
  default as authService,
  default as AuthService,
} from "@/services/auth.service";
import {
  default as tokenService,
  default as TokenService,
} from "@/services/token.service";
import { createContext, ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  user: User;
}

interface User {
  id: number;
  name: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (name: string, username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

const PUBLIC_PATHS = ["/login", "/register"];

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Проверка аутентификации при загрузке страницы
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("[AuthProvider] Checking authentication on page load");
        const accessToken = tokenService.getAccessToken();
        const isPublicPath = PUBLIC_PATHS.includes(pathname || "");

        console.log(`[AuthProvider] Current path: ${pathname}`);
        console.log(`[AuthProvider] Is public path: ${isPublicPath}`);
        console.log(`[AuthProvider] Access token present: ${!!accessToken}`);

        if (accessToken) {
          try {
            // Здесь можно добавить запрос на получение профиля пользователя
            // const userProfile = await authService.getProfile();
            // setUser(userProfile);

            // Временное решение - устанавливаем базовый объект пользователя
            setUser({ id: 1, name: "Пользователь", username: "user" });

            // Если аутентифицированный пользователь попал на страницу логина, перенаправляем на главную
            if (isPublicPath) {
              console.log(
                "[AuthProvider] Authenticated user on login page, redirecting to home"
              );
              router.push("/");
            }
          } catch (err) {
            console.error("[AuthProvider] Error fetching user data:", err);
            tokenService.clearTokens();
          }
        } else if (!isPublicPath) {
          // Если неаутентифицированный пользователь попал на защищенную страницу, перенаправляем на логин
          console.log(
            "[AuthProvider] Unauthenticated user on protected page, redirecting to login"
          );
          router.push("/login");
        }

        setLoading(false);
      } catch (err) {
        console.error("[AuthProvider] Auth check error:", err);
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const register = async (
    name: string,
    username: string,
    password: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = (await AuthService.register(
        name,
        username,
        password
      )) as AuthResponse;

      // Используем доступные токены
      const accessToken = response.accessToken || response.access_token;
      const refreshToken = response.refreshToken || response.refresh_token;

      if (accessToken) {
        TokenService.setAccessToken(accessToken);
      }

      if (refreshToken) {
        TokenService.setRefreshToken(refreshToken);
      }

      if (response.user) {
        setUser(response.user);
      }

      setLoading(false);
      router.push("/");
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Произошла ошибка при регистрации";
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(username, password);
      console.log("Login response:", response);

      if (response && typeof response === "object") {
        // Поддержка как camelCase, так и snake_case имён свойств
        const accessToken = response.accessToken || response.access_token;
        const refreshToken = response.refreshToken || response.refresh_token;
        const { user } = response;

        // Проверяем, что токены имеют значения перед сохранением
        if (accessToken && typeof accessToken === "string") {
          tokenService.setAccessToken(accessToken);
        } else {
          console.error("Invalid accessToken received:", accessToken);
        }

        if (refreshToken && typeof refreshToken === "string") {
          tokenService.setRefreshToken(refreshToken);
        } else {
          console.error("Invalid refreshToken received:", refreshToken);
        }

        if (user) {
          setUser(user);
        } else {
          // Временное решение - создаем базовый объект пользователя если не получили от сервера
          setUser({ id: 1, name: "Пользователь", username });
        }

        // Автоматический редирект после успешного логина
        console.log(
          "[AuthProvider] Login successful, redirecting to home page"
        );
        setTimeout(() => {
          router.push("/");
        }, 500); // Небольшая задержка чтобы куки успели сохраниться
      } else {
        console.error("Invalid response format:", response);
      }

      setLoading(false);
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Неверное имя пользователя или пароль";
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
      tokenService.clearTokens();
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
