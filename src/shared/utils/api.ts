import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://checkmateai.ru",
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
        // Используем полный URL для refresh endpoint
        const refreshUrl =
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh` ||
          "https://https://checkmateai.ru/auth/refresh";
        await fetch(refreshUrl, {
          method: "POST",
          credentials: "include",
          cache: "no-store", // Отключаем кэширование
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
