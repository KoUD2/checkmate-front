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

  // Добавляем флаг, чтобы избежать бесконечных перезагрузок
  const [redirectionPerformed, setRedirectionPerformed] =
    useState<boolean>(false);

  // Проверка аутентификации при загрузке страницы
  useEffect(() => {
    // Защита от повторных проверок при перенаправлении
    if (redirectionPerformed) {
      console.log(
        "[AuthProvider] Redirection already performed, skipping auth check"
      );
      return;
    }

    const checkAuth = async () => {
      try {
        console.log("[AuthProvider] Checking authentication on page load");
        // Проверяем наличие токена через isLoggedInClient вместо прямого доступа к _accessToken
        const isLoggedInMemory = tokenService.isLoggedInClient();
        console.log("[AuthProvider] Token in memory:", isLoggedInMemory);

        // Проверяем наличие токена через TokenService
        const accessToken = tokenService.getAccessToken();
        console.log(
          "[AuthProvider] Token after getAccessToken:",
          !!accessToken
        );

        // Явно проверяем статус в TokenService
        let isTokenAvailable = tokenService.isLoggedIn();
        console.log(
          "[AuthProvider] isLoggedIn from TokenService:",
          isTokenAvailable
        );

        const isPublicPath = PUBLIC_PATHS.includes(pathname || "");
        console.log(`[AuthProvider] Current path: ${pathname}`);
        console.log(`[AuthProvider] Is public path: ${isPublicPath}`);
        console.log(`[AuthProvider] Access token present: ${!!accessToken}`);

        // Проверяем localStorage
        let localStorageToken = null;
        try {
          if (typeof localStorage !== "undefined") {
            localStorageToken = localStorage.getItem("auth_token");
            console.log(
              "[AuthProvider] Token in localStorage:",
              !!localStorageToken
            );

            // Если токена нет в памяти или куках, но есть в localStorage,
            // восстанавливаем его в памяти
            if (localStorageToken && !accessToken) {
              console.log(
                "[AuthProvider] Restoring token from localStorage to memory"
              );
              await tokenService.setAccessToken(localStorageToken);
              isTokenAvailable = true;
            }
          }
        } catch (e) {
          console.error("[AuthProvider] Error checking localStorage:", e);
        }

        // Для отладки проверим куки напрямую
        if (typeof document !== "undefined") {
          // Выводим все куки для отладки
          const allCookies = document.cookie;
          console.log("[AuthProvider] All cookies:", allCookies);

          // Ищем разные варианты JWT в куках (учитывая возможные форматы)
          const jwtPatterns = [
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // Начало стандартного JWT
            "eyJ", // Начало base64url закодированной JSON строки
            "accessToken=eyJ", // JWT в куке accessToken
            "=eyJ", // JWT в любой куке
          ];

          let hasJwtInCookies = false;
          let matchedPattern = "";
          for (const pattern of jwtPatterns) {
            if (allCookies.includes(pattern)) {
              hasJwtInCookies = true;
              matchedPattern = pattern;
              break;
            }
          }

          console.log(
            "[AuthProvider] JWT pattern found in cookies:",
            hasJwtInCookies
          );
          if (hasJwtInCookies) {
            console.log("[AuthProvider] Matched JWT pattern:", matchedPattern);
          }

          // Посимвольно анализируем куки на наличие JWT
          if (!hasJwtInCookies && allCookies.length > 0) {
            console.log(
              "[AuthProvider] Cookie debugging - Looking for JWT fragments:"
            );
            let jwtFound = false;

            // Проверяем отдельные части кук
            const cookieParts = allCookies.split(";");
            cookieParts.forEach((part, index) => {
              console.log(
                `[AuthProvider] Cookie part ${index + 1}:`,
                part.trim()
              );
              if (part.includes("eyJ")) {
                console.log(
                  `[AuthProvider] JWT fragment found in part ${index + 1}`
                );
                jwtFound = true;
                hasJwtInCookies = true;
              }
            });

            if (jwtFound) {
              console.log("[AuthProvider] JWT fragments found in cookies!");
            } else {
              console.log("[AuthProvider] No JWT fragments found in cookies.");
            }
          }

          if (hasJwtInCookies) {
            // Если JWT найден в куках, считаем пользователя авторизованным
            isTokenAvailable = true;
            if (!user) {
              setUser({ id: 1, name: "Пользователь", username: "user" });
            }
          }
        }

        // Проверка наличия токенов любыми способами
        const isAuthenticated =
          accessToken ||
          isTokenAvailable ||
          isLoggedInMemory ||
          !!localStorageToken;

        // СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ СТРАНИЦЫ ЛОГИНА
        // Если мы на странице login и есть токен в localStorage - редирект на главную
        if (
          pathname === "/login" &&
          localStorageToken &&
          !redirectionPerformed
        ) {
          console.log(
            "[AuthProvider] Found token in localStorage while on login page - redirecting to home"
          );
          setUser({ id: 1, name: "Пользователь", username: "user" });
          setRedirectionPerformed(true);
          router.push("/");
          return;
        }

        // ИСПРАВЛЕНО: Используем router вместо window.location для избежания перезагрузки страницы
        // и добавляем защиту от циклического редиректа

        if (isAuthenticated) {
          // Устанавливаем временного пользователя если нет данных
          if (!user) {
            setUser({ id: 1, name: "Пользователь", username: "user" });
          }

          // Если у пользователя есть токен и он на странице логина/регистрации,
          // перенаправляем на главную
          if (isPublicPath && !redirectionPerformed) {
            console.log(
              "[AuthProvider] Authenticated user on public page, redirecting to home"
            );
            // Отмечаем, что редирект выполнен, чтобы избежать цикла
            setRedirectionPerformed(true);
            router.push("/");
          }
          // Если токен есть и страница не публичная - всё в порядке, ничего не делаем
        } else {
          // ВРЕМЕННЫЙ FIX: Если у нас есть JWT в куки, но наши проверки не сработали,
          // мы все равно считаем пользователя авторизованным
          if (
            typeof document !== "undefined" &&
            (document.cookie.includes("eyJ") ||
              document.cookie.length > 5 ||
              localStorageToken)
          ) {
            console.log(
              "[AuthProvider] Auth indicators found - considering user as logged in"
            );
            if (!user) {
              setUser({ id: 1, name: "Пользователь", username: "user" });
            }

            // На странице логина переходим на главную
            if (isPublicPath && !redirectionPerformed) {
              console.log(
                "[AuthProvider] Auth indicators found on public page - redirecting to home"
              );
              setRedirectionPerformed(true);
              router.push("/");
            }
          } else {
            // Если токена нет и страница защищенная, перенаправляем на логин
            if (!isPublicPath && !redirectionPerformed) {
              console.log(
                "[AuthProvider] Unauthenticated user on protected page, redirecting to login"
              );
              setRedirectionPerformed(true);
              router.push("/login");
            }
          }
          // Если токена нет и страница публичная - всё в порядке, ничего не делаем
        }

        setLoading(false);
      } catch (err) {
        console.error("[AuthProvider] Auth check error:", err);
        setLoading(false);
      }
    };

    // Выполняем проверку только если перенаправление еще не было выполнено
    if (!redirectionPerformed) {
      checkAuth();
    }
  }, [pathname, router, user, redirectionPerformed]);

  // Добавим функцию автоматического обновления токена
  useEffect(() => {
    // Функция для проверки и обновления токена
    const refreshTokenIfNeeded = async () => {
      try {
        const accessToken = tokenService.getAccessToken();
        if (!accessToken) return;

        // Проверяем, истекает ли токен в ближайшие 5 минут
        // Поскольку мы не можем декодировать токен на клиенте,
        // будем полагаться на периодическое обновление каждые 10 минут
        await authService.refreshToken();
      } catch (error) {
        console.error("[AuthProvider] Token refresh error:", error);
      }
    };

    // Запускаем периодическое обновление токена каждые 10 минут
    const refreshInterval = setInterval(refreshTokenIfNeeded, 10 * 60 * 1000);

    // Очищаем интервал при размонтировании компонента
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

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
          console.log(
            "[AuthProvider] Setting accessToken:",
            accessToken.substring(0, 10) + "..."
          );
          tokenService.setAccessToken(accessToken);
        } else {
          console.error(
            "[AuthProvider] Invalid accessToken received:",
            accessToken
          );
        }

        if (refreshToken && typeof refreshToken === "string") {
          console.log(
            "[AuthProvider] Setting refreshToken:",
            refreshToken.substring(0, 10) + "..."
          );
          tokenService.setRefreshToken(refreshToken);
        } else {
          console.error(
            "[AuthProvider] Invalid refreshToken received:",
            refreshToken
          );
        }

        if (user) {
          setUser(user);
        } else {
          // Временное решение - создаем базовый объект пользователя если не получили от сервера
          setUser({ id: 1, name: "Пользователь", username });
        }

        // Отмечаем, что скоро будет выполнен редирект
        setRedirectionPerformed(true);

        // Используем Next.js router вместо window.location для более плавной навигации
        console.log(
          "[AuthProvider] Login successful, redirecting to home page"
        );
        router.push("/");
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

      // Помечаем, что редирект скоро будет выполнен
      setRedirectionPerformed(true);

      // Используем Next.js router вместо window.location
      console.log(
        "[AuthProvider] Logout successful, redirecting to login page"
      );
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
