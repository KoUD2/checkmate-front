import axios from "axios";

// Для локальной разработки и билда используем относительные пути к API-маршрутам
// которые затем прокисруют запросы к реальному бэкенду
const isServerSide = typeof window === "undefined";
const baseURL = isServerSide
  ? process.env.NEXT_PUBLIC_API_URL || "https://checkmateai.ru"
  : "/api"; // Используем локальный API route для проксирования запросов с фронтенда

const api = axios.create({
  baseURL,
  withCredentials: true, // Важно для отправки куков с запросами
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Проверяем, что ошибка 401 и запрос еще не повторялся
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Используем локальный API маршрут для обновления токена вместо прямого запроса
        const refreshUrl = "/api/auth/refresh";
        await fetch(refreshUrl, {
          method: "POST",
          credentials: "include",
          cache: "no-store", // Отключаем кэширование
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken: localStorage.getItem("refreshToken"),
          }),
        });

        // Повторяем исходный запрос
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Ошибка обновления токена:", refreshError);
        // Редиректим на логин только если это не запрос на логин/регистрацию
        if (
          !originalRequest.url.includes("/auth/login") &&
          !originalRequest.url.includes("/users")
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
