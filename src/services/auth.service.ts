import api from "@/shared/utils/api";

class AuthService {
  async register(name: string, username: string, password: string) {
    try {
      const response = await api.post("/api/auth/register", {
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
      const response = await api.post("/api/auth/login", {
        username,
        password,
      });
      window.location.assign("/");
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async refreshToken() {
    try {
      const response = await api.post("/api/auth/refresh", {
        refreshToken: localStorage.getItem("refreshToken") || "",
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
