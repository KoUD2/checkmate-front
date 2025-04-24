import { NextResponse, type NextRequest } from "next/server";

// Расширяем список публичных путей для обхода проверки авторизации
const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/_next",
  "/favicon.ico",
  "/auth/refresh", // Добавляем путь для обновления токена
]);

export async function middleware(request: NextRequest) {
  // Включаем проверку и в dev-режиме для тестирования HTTPS
  // if (process.env.NODE_ENV === 'development') {
  // 	return NextResponse.next()
  // }

  const { pathname } = request.nextUrl;

  // Пропускаем статические файлы и публичные пути
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Проверка cookies через заголовки и объект cookies
  const accessToken = request.cookies.get("accessToken")?.value;
  const cookieHeader = request.headers.get("cookie") || "";

  console.log("Middleware check for:", pathname);
  console.log("AccessToken in cookies:", accessToken ? "present" : "missing");
  console.log("Cookies in header:", cookieHeader.includes("accessToken"));

  if (!accessToken && !cookieHeader.includes("accessToken")) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.headers.set("x-middleware-cache", "no-cache");

    // Устанавливаем заголовки безопасности для HTTPS
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("x-middleware-cache", "no-cache");

  // Устанавливаем заголовки безопасности для HTTPS
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|register|_next).*)",
  ],
};
