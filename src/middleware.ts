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

  // API routes bypass authentication
  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Получаем токен из куки
  const accessToken = request.cookies.get("accessToken")?.value;
  const hasValidToken = accessToken && (await isTokenValid(accessToken));

  // Если на странице логина и токен валидный - редирект на главную
  if (PUBLIC_PAGES.has(pathname) && hasValidToken) {
    console.log("User already authenticated, redirecting to home page");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Если не на публичной странице и нет валидного токена - редирект на логин
  if (!PUBLIC_PAGES.has(pathname) && !hasValidToken) {
    console.log("No valid token found, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // В остальных случаях пропускаем запрос
  return NextResponse.next();
}

// Вспомогательная функция для проверки валидности токена
async function isTokenValid(token: string): Promise<boolean> {
  try {
    return await verifyJWT(token);
  } catch (error) {
    console.error("Token verification error:", error);
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
