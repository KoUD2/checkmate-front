export class TokenService {
  private static instance: TokenService | null = null;
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private _isTokenAvailable: boolean = false;

  private readonly ACCESS_TOKEN_KEY = "accessToken";
  private readonly REFRESH_TOKEN_KEY = "refreshToken";

  private constructor() {
    // приватный конструктор для синглтона
  }

  setAccessToken(token: string) {
    this._accessToken = token;
    this._isTokenAvailable = true;

    // В Next.js 15 рекомендуется использовать js-cookie или эквивалент
    try {
      const cookieOptions = "path=/; max-age=900; samesite=lax";
      document.cookie = `accessToken=${token}; ${cookieOptions}`;
      console.log(
        "[TokenService] accessToken set in client cookie",
        token.substring(0, 10) + "..."
      );
    } catch (error) {
      console.error("[TokenService] Error setting access token cookie:", error);
    }

    return Promise.resolve();
  }

  setRefreshToken(token: string) {
    this._refreshToken = token;

    try {
      const cookieOptions = "path=/; max-age=604800; samesite=lax";
      document.cookie = `refreshToken=${token}; ${cookieOptions}`;
      console.log(
        "[TokenService] refreshToken set in client cookie",
        token.substring(0, 10) + "..."
      );
    } catch (error) {
      console.error(
        "[TokenService] Error setting refresh token cookie:",
        error
      );
    }
  }

  refreshAccessToken() {
    // Используем https URL
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://checkmateai.ru";
    return fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include", // Важно для отправки и получения cookies
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: this.getRefreshToken(),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to refresh token");
        }
        return response.json();
      })
      .then((data) => {
        const newAccessToken = data.accessToken || data.access_token;
        if (newAccessToken) {
          this.setAccessToken(newAccessToken);
        }
        return data;
      });
  }

  getAccessToken(): string | null {
    try {
      if (typeof document === "undefined") return this._accessToken;

      // Если у нас уже есть токен в памяти, используем его
      if (this._accessToken) return this._accessToken;

      // Используем улучшенный метод для получения куки
      const token = this.getCookieValue(this.ACCESS_TOKEN_KEY);
      if (token) {
        this._accessToken = token;
        this._isTokenAvailable = true;
        return token;
      }

      // Проверяем косвенные признаки наличия httpOnly cookie
      // Так как JavaScript не может прочитать httpOnly cookies напрямую
      this._isTokenAvailable = false;

      return null;
    } catch (error) {
      console.error("[TokenService] Error getting access token:", error);
      return null;
    }
  }

  isAccessTokenAvailable(): boolean {
    if (this._accessToken) return true;

    // Если нет токена в памяти, пробуем получить его из куки
    this.getAccessToken(); // обновит флаг _isTokenAvailable
    return this._isTokenAvailable;
  }

  getRefreshToken(): string | null {
    try {
      if (typeof document === "undefined") return this._refreshToken;

      // Если у нас уже есть токен в памяти, используем его
      if (this._refreshToken) return this._refreshToken;

      // Используем улучшенный метод для получения куки
      const token = this.getCookieValue(this.REFRESH_TOKEN_KEY);
      if (token) {
        this._refreshToken = token;
        return token;
      }

      // JavaScript не может прочитать httpOnly cookies
      return null;
    } catch (error) {
      console.error("[TokenService] Error getting refresh token:", error);
      return null;
    }
  }

  // Проверяет наличие cookie с указанным именем без возможности прочитать значение
  // Этот метод больше не используется в коде, так как JavaScript не может надежно
  // определить наличие httpOnly cookies. Оставлен для совместимости.
  private checkTokenWithoutValue(cookieName: string): boolean {
    console.warn(
      "[TokenService] checkTokenWithoutValue is deprecated - JavaScript cannot reliably detect httpOnly cookies"
    );
    try {
      if (typeof document === "undefined") return false;

      const cookies = document.cookie.split(";");

      for (const cookie of cookies) {
        const equalsIndex = cookie.indexOf("=");
        const name =
          equalsIndex !== -1
            ? cookie.substring(0, equalsIndex).trim()
            : cookie.trim();

        if (name === cookieName) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(
        `[TokenService] Error checking token ${cookieName}:`,
        error
      );
      return false;
    }
  }

  // Вспомогательный метод для отладки всех cookie
  private debugParseCookies() {
    try {
      console.log("[TokenService] Debugging all cookies");
      const cookiesStr = document.cookie;
      console.log("[TokenService] Raw cookies string:", cookiesStr);

      if (!cookiesStr) {
        console.log("[TokenService] No JavaScript-accessible cookies found");
        return;
      }

      const cookies = cookiesStr.split(";");
      console.log("[TokenService] Number of cookies found:", cookies.length);

      cookies.forEach((cookie, index) => {
        try {
          const equalsPos = cookie.indexOf("=");
          if (equalsPos === -1) {
            console.log(
              `[TokenService] Invalid cookie format #${index + 1}: ${cookie}`
            );
            return;
          }

          const name = cookie.substring(0, equalsPos).trim();
          const value = cookie.substring(equalsPos + 1).trim();

          console.log(
            `[TokenService] Cookie #${
              index + 1
            }: Name='${name}', Value exists=${!!value}, Value length=${
              value?.length || 0
            }`
          );
        } catch (e) {
          console.error(
            `[TokenService] Error parsing cookie #${index + 1}:`,
            e
          );
        }
      });
    } catch (e) {
      console.error("[TokenService] Error in debugParseCookies:", e);
    }
  }

  // Вспомогательный метод для корректного получения значения cookie
  getCookieValue(name: string): string | null {
    try {
      if (typeof document === "undefined") return null;

      const cookies = document.cookie.split(";");

      for (const cookie of cookies) {
        // Разделяем cookie только по первому символу '='
        const equalsIndex = cookie.indexOf("=");
        if (equalsIndex === -1) continue;

        const cookieName = cookie.substring(0, equalsIndex).trim();
        const cookieValue = cookie.substring(equalsIndex + 1).trim();

        if (cookieName === name) {
          return cookieValue;
        }
      }

      return null;
    } catch (error) {
      console.error(`[TokenService] Error getting cookie '${name}':`, error);
      return null;
    }
  }

  clearTokens() {
    console.log("[TokenService] Clearing all tokens");
    this._accessToken = null;
    this._refreshToken = null;
    this._isTokenAvailable = false;

    // Очищаем куки при выходе
    try {
      // Метод 1: использование expires в прошлом
      document.cookie =
        "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
      document.cookie =
        "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";

      // Метод 2: установка max-age=0
      document.cookie = "accessToken=; path=/; max-age=0; samesite=lax";
      document.cookie = "refreshToken=; path=/; max-age=0; samesite=lax";

      console.log("[TokenService] Client cookies cleared");

      // Для httpOnly cookies нужно сделать API запрос на logout
      console.log(
        "[TokenService] Note: httpOnly cookies require server-side logout"
      );
    } catch (error) {
      console.error("[TokenService] Error clearing cookies:", error);
      // Игнорируем ошибки в SSR режиме
    }
  }

  /**
   * Проверяет, залогинен ли пользователь, на основе наличия токена доступа
   */
  isLoggedIn(): boolean {
    try {
      // Проверяем наличие токена и обновляем статус
      const accessToken = this.getAccessToken();

      // Для httpOnly cookies в getAccessToken больше не возвращается "httpOnly",
      // поэтому если токена нет в доступных куках, нам нужно полагаться на API запросы
      if (accessToken) {
        this._isTokenAvailable = true;
        return true;
      }

      // Если токен не найден в JavaScript доступных куках, то
      // необходимо сделать реальный API запрос с credentials: 'include'
      // чтобы проверить, есть ли действующая сессия с httpOnly cookies

      // Для простоты используем текущее значение _isTokenAvailable
      return this._isTokenAvailable;
    } catch (error) {
      console.error("[TokenService] Error checking login status:", error);
      return false;
    }
  }

  /**
   * Проверяет, залогинен ли пользователь на клиенте, без выполнения запросов к серверу
   */
  isLoggedInClient(): boolean {
    return this._isTokenAvailable;
  }

  // Статический метод для получения экземпляра класса (синглтон)
  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }
}

// Создаем и экспортируем экземпляр TokenService
const tokenService = TokenService.getInstance();
export default tokenService;
