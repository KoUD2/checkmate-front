import api from "@/shared/utils/api";
import tokenService from "./token.service";

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

  private tokenService: typeof tokenService;

  constructor() {
    // 3. Инициализируем service в конструкторе
    this.tokenService = tokenService;
  }

  async login(username: string, password: string) {
    try {
      // Using the new API path structure
      const response = await api.post("/api-auth/login", {
        username,
        password,
      });

      console.log("API response from /api-auth/login:", response.status);

      // Проверяем данные ответа
      const data = response.data;
      console.log("Login response data:", JSON.stringify(data, null, 2));

      // Извлекаем токены, поддерживая разные форматы ответов
      const access_token = data.access_token || data.accessToken;
      const refresh_token = data.refresh_token || data.refreshToken;

      if (!access_token) {
        console.error("No access token received in response:", data);
        throw new Error("No access token received");
      }

      console.log("Setting tokens from login response");
      // Установка токенов и ожидание завершения операции
      await tokenService.setAccessToken(access_token);
      if (refresh_token) await tokenService.setRefreshToken(refresh_token);

      // Проверяем, что токены установлены
      console.log("Verifying tokens were set correctly");
      const storedAccessToken = tokenService.getAccessToken();
      console.log(`Access token stored: ${!!storedAccessToken}`);

      console.log("Login OK! Manual redirect needed.");

      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      // Using the new API path structure
      const response = await api.post("/api-auth/refresh", {
        refreshToken: tokenService.getRefreshToken() || "",
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      // Using the new API path structure
      await api.post("/api-auth/logout");
    } catch (error) {
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
