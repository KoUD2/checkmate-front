import axios from "axios";
import { getCookie } from "cookies-next";
import tokenService from "@/services/token.service";

// Update baseURL to remove /api since that's handled in the service files
const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "https://checkmate-ashen.vercel.app";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Добавляем интерцептор для отлавливания ошибок и автоматического обновления токена
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Проверяем, является ли ошибка ошибкой авторизации (401)
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("[API] 401 error detected, attempting to refresh token");
      originalRequest._retry = true;

      try {
        // Пробуем обновить токен
        await tokenService.refreshAccessToken();

        // Проверяем получили ли мы новый токен
        const newToken = tokenService.getAccessToken();
        if (newToken) {
          console.log("[API] Token refreshed successfully, retrying request");

          // Если токен обновлен, повторяем запрос
          return api(originalRequest);
        } else {
          console.error("[API] Failed to refresh token");

          // Если не удалось обновить токен, перенаправляем на логин
          if (typeof window !== "undefined") {
            console.log("[API] Redirecting to login page");
            tokenService.clearTokens();
            window.location.href = "/login";
          }
        }
      } catch (refreshError) {
        console.error("[API] Error refreshing token:", refreshError);

        // В случае ошибки обновления токена, очищаем токены и перенаправляем на логин
        if (typeof window !== "undefined") {
          tokenService.clearTokens();
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

// Debug cookies in console
const debugCookies = () => {
  try {
    console.log("Current cookies:", document.cookie);
    const accessToken = getCookie("accessToken");
    const refreshToken = getCookie("refreshToken");
    console.log("Access token from cookie:", accessToken);
    console.log("Refresh token from cookie:", refreshToken);

    if (!accessToken) {
      console.log("No access token found in cookies");
    }
  } catch (e) {
    console.error("Error reading cookies:", e);
  }
};

// Add token to request headers
api.interceptors.request.use((config) => {
  debugCookies();
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`API response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error("API error:", error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default api;
