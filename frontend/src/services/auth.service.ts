class AuthService {
  async signup(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    organization?: string
  ) {
    const response = await fetch("/api-auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, password, organization }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Ошибка регистрации");
    }
    return data;
  }

  async login(email: string, password: string) {
    const response = await fetch("/api-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Неверный email или пароль");
    }
    return data; // { accessToken, user }
  }

  async refreshToken() {
    const response = await fetch("/api-auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    if (!response.ok) throw new Error("Ошибка обновления токена");
    return data; // { accessToken }
  }

  async logout() {
    await fetch("/api-auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => null);
  }
}

const authService = new AuthService();
export default authService;
