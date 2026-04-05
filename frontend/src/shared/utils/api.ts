import axios from "axios";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

// Attach access token from cookie to every request
api.interceptors.request.use((config) => {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshRes = await fetch("/api-auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data?.accessToken) {
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        // ignore
      }

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
