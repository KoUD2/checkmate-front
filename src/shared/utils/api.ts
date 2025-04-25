import axios from "axios";
import { getCookie } from "cookies-next";

// Always use the relative path to route through Next.js API routes
const baseURL = "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Debug cookies in console
const debugCookies = () => {
  try {
    console.log("Current cookies:", document.cookie);
    const accessToken = getCookie("accessToken");
    const refreshToken = getCookie("refreshToken");
    console.log("Access token from cookie:", accessToken);
    console.log("Refresh token from cookie:", refreshToken);
  } catch (e) {
    console.error("Error reading cookies:", e);
  }
};

api.interceptors.request.use((config) => {
  debugCookies();
  const accessToken = getCookie("accessToken");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    console.warn("No access token found in cookies");
  }
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
