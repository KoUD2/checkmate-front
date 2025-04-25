import api from "@/shared/utils/api";

class AuthService {
  async register(name: string, username: string, password: string) {
    try {
      const response = await api.post("/auth/register", {
        name,
        username,
        password,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async login(username: string, password: string) {
    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });

      // Log the response for debugging
      console.log("Login response data:", response.data);

      // Check if the response contains the expected data
      if (!response.data) {
        console.error("Login response missing data");
        throw new Error("Ошибка авторизации: отсутствуют данные в ответе");
      }

      // Check tokens using snake_case property names
      const hasAccessToken = !!response.data.access_token;
      const hasRefreshToken = !!response.data.refresh_token;

      // Redirect only after successful login with valid tokens
      if (hasAccessToken && hasRefreshToken) {
        // Schedule redirect to avoid race conditions
        setTimeout(() => window.location.assign("/"), 100);
      } else {
        console.warn("Login successful but tokens missing:", {
          hasAccessToken,
          hasRefreshToken,
        });
      }

      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const response = await api.post("/auth/refresh", {
        refreshToken: localStorage.getItem("refreshToken") || "",
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
