// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./lib/auth";

// Публичные страницы (не требуют авторизации)
const PUBLIC_PAGES = new Set(["/login", "/register"]);

// API endpoints should bypass auth
const isApiRoute = (pathname: string) => {
  return pathname.startsWith("/api-auth/");
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Processing request for path: ${pathname}`);
  console.log(`[Middleware] Full URL: ${request.url}`);

  // API routes bypass authentication
  if (isApiRoute(pathname)) {
    console.log("[Middleware] API route detected, bypassing auth check");
    return NextResponse.next();
  }

  // Получаем токен из куки
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  console.log(`[Middleware] Access token present: ${!!accessToken}`);
  console.log(`[Middleware] Refresh token present: ${!!refreshToken}`);

  if (accessToken) {
    const tokenPreview =
      accessToken.substring(0, 10) +
      "..." +
      accessToken.substring(accessToken.length - 5);
    console.log(`[Middleware] Access token preview: ${tokenPreview}`);
  }

  // Проверяем валидность токена
  let hasValidToken = false;
  if (accessToken) {
    hasValidToken = await isTokenValid(accessToken);
    console.log(`[Middleware] Token validation result: ${hasValidToken}`);
  }

  console.log(`[Middleware] Is public page: ${PUBLIC_PAGES.has(pathname)}`);

  // Если на странице логина и токен валидный - редирект на главную
  if (PUBLIC_PAGES.has(pathname) && hasValidToken) {
    console.log(
      "[Middleware] User is authenticated and on login/register page, redirecting to home page"
    );
    const redirectUrl = new URL("/", request.url);
    console.log(`[Middleware] Redirecting to: ${redirectUrl.toString()}`);
    try {
      // Для устранения возможной проблемы с кэшированием добавляем случайный параметр
      redirectUrl.searchParams.set("ts", Date.now().toString());
      return NextResponse.redirect(redirectUrl);
    } catch (error) {
      console.error("[Middleware] Error during redirect:", error);
    }
  }

  // Если не на публичной странице и нет валидного токена - редирект на логин
  if (!PUBLIC_PAGES.has(pathname) && !hasValidToken) {
    console.log(
      "[Middleware] No valid token found on protected page, redirecting to login"
    );
    const redirectUrl = new URL("/login", request.url);
    console.log(`[Middleware] Redirecting to: ${redirectUrl.toString()}`);
    try {
      // Для устранения возможной проблемы с кэшированием добавляем случайный параметр
      redirectUrl.searchParams.set("ts", Date.now().toString());
      return NextResponse.redirect(redirectUrl);
    } catch (error) {
      console.error("[Middleware] Error during redirect:", error);
    }
  }

  // Проверяем, есть ли токен в куке, но он повреждён - тогда пробуем обновить
  if (!hasValidToken && accessToken) {
    console.log(
      "[Middleware] Invalid access token found, attempting to refresh..."
    );
    const response = NextResponse.next();

    // Добавляем хедер для фронтенда, который может обработать необходимость обновления токена
    response.headers.set("X-Need-Token-Refresh", "true");
    return response;
  }

  // В остальных случаях пропускаем запрос
  console.log("[Middleware] Allowing request to proceed");
  return NextResponse.next();
}

// Вспомогательная функция для проверки валидности токена
async function isTokenValid(token: string): Promise<boolean> {
  try {
    console.log("[Middleware] Validating token...");
    const result = await verifyJWT(token);
    console.log(`[Middleware] Token validation completed: ${result}`);
    return result;
  } catch (error) {
    console.error("[Middleware] Token verification error:", error);
    return false;
  }
}

// Configure matcher to exclude API routes from middleware
export const config = {
  matcher: [
    // Skip all internal paths, API routes, and static files
    "/((?!_next/static|_next/image|favicon.ico|api-auth/).*)",
  ],
};
