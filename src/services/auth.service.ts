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
      // Use the new API route that doesn't conflict with page routes
      const response = await api.post("/api/auth-proxy/login", {
        username,
        password,
      });

      const { access_token, refresh_token } = response.data;
      if (!access_token) throw new Error("No access token received");

      console.log(1);
      // Установка куки с флагом secure
      tokenService.setAccessToken(access_token);
      if (refresh_token) tokenService.setRefreshToken(refresh_token);

      console.log("Login OK! Manual redirect needed.");
      // if (typeof window !== 'undefined') {
      // 	window.location.href = '/'
      // 	window.location.reload()
      // }

      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      // Use the new API route that doesn't conflict with page routes
      const response = await api.post("/api/auth-proxy/refresh", {
        refreshToken: tokenService.getRefreshToken() || "",
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      // Use the new API route that doesn't conflict with page routes
      await api.post("/api/auth-proxy/logout");
    } catch (error) {
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
