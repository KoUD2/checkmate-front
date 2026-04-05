// lib/auth.ts
import { jwtVerify, decodeJwt } from "jose";

export async function verifyJWT(token: string): Promise<boolean> {
  try {
    // Базовая проверка структуры токена
    if (!token || token.trim() === "" || token.split(".").length !== 3) {
      console.error("Invalid token format");
      return false;
    }

    // Декодируем токен без проверки (просто чтобы посмотреть payload)
    try {
      const decoded = decodeJwt(token);
      console.log("Decoded token payload (without verification):", decoded);

      // Проверка срока действия токена
      if (decoded.exp) {
        const expiryDate = new Date(decoded.exp * 1000);
        const now = new Date();
        console.log(
          `Token expiry: ${expiryDate.toISOString()}, current time: ${now.toISOString()}`
        );

        if (expiryDate < now) {
          console.error("Token expired");
          return false;
        }
      }
    } catch (decodeError) {
      console.error("Failed to decode token:", decodeError);
    }

    // Проверяем наличие переменной окружения
    const secretText = process.env.JWT_ACCESS_SECRET;
    if (!secretText) {
      console.error(
        "JWT_ACCESS_SECRET is not defined in environment variables"
      );
      return false;
    }

    console.log(`JWT_ACCESS_SECRET is defined, length: ${secretText.length}`);

    // Секрет должен быть в том же формате, как на сервере
    // Вариант 1: текстовый ключ (обычная строка)
    const secretKey = new TextEncoder().encode(secretText);

    // Вариант 2: если секрет на сервере в base64
    // const secretBase64 = process.env.JWT_ACCESS_SECRET!;
    // const secretKey = Buffer.from(secretBase64, 'base64');

    // Расширенная проверка с логированием
    console.log("Trying to verify token with alg: HS256");
    console.log(
      `Token structure check: ${
        token.split(".").length === 3
          ? "valid JWT format"
          : "invalid JWT format"
      }`
    );

    const result = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"], // Явно указываем алгоритм
    });

    console.log(
      "JWT verification successful, payload:",
      JSON.stringify(result.payload)
    );
    if (result.payload.exp) {
      const expiry = new Date(result.payload.exp * 1000);
      console.log(`Token expires at: ${expiry.toISOString()}`);
    }
    return true;
  } catch (error: unknown) {
    // Детальное логирование ошибки
    console.error("JWT verification failed:", error);

    // Проверка типа перед доступом к свойствам
    if (error instanceof Error) {
      if ("code" in error) {
        // Теперь TypeScript знает, что объект error имеет свойство code
        const errorWithCode = error as { code: string };

        if (errorWithCode.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
          console.error("Причина: неправильный секрет или алгоритм подписи");
        } else if (errorWithCode.code === "ERR_JWT_EXPIRED") {
          console.error("Причина: токен истек");
        }
      }
    }

    // FALLBACK: Если проверка не прошла из-за секрета, всё равно разрешаем доступ в разработке
    // В реальной среде нужно убрать эту часть!
    if (process.env.NODE_ENV === "development") {
      console.log(
        "DEVELOPMENT MODE: Allowing access despite JWT verification failure"
      );
      try {
        const decoded = decodeJwt(token);
        const now = new Date().getTime() / 1000;
        if (decoded.exp && decoded.exp > now) {
          console.log("Token not expired, allowing access in development mode");
          return true;
        }
      } catch (e) {
        console.error("Failed to decode token in fallback mode:", e);
      }
    }

    return false;
  }
}
