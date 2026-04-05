import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    // Forward browser's refreshToken cookie to NestJS
    const cookieHeader = request.headers.get("cookie") || "";

    const apiResponse = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });

    const data = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      const response = NextResponse.json(
        { message: "Ошибка обновления токена" },
        { status: apiResponse.status }
      );
      // Clear stale cookies
      response.cookies.delete("accessToken");
      return response;
    }

    // NestJS returns: { success, data: { accessToken } }
    const accessToken = data?.data?.accessToken;

    const response = NextResponse.json({ accessToken }, { status: 200 });

    if (accessToken) {
      response.cookies.set({
        name: "accessToken",
        value: accessToken,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60,
        path: "/",
      });
    }

    // Forward new refreshToken cookie from NestJS
    const setCookieHeader = apiResponse.headers.get("set-cookie");
    if (setCookieHeader) {
      response.headers.append("Set-Cookie", setCookieHeader);
    }

    return response;
  } catch (error) {
    console.error("Refresh proxy error:", error);
    return NextResponse.json(
      { message: "Ошибка при обработке запроса обновления токена" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
