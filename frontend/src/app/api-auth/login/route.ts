import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();

    const apiResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: data?.error?.message || "Ошибка авторизации" },
        { status: apiResponse.status }
      );
    }

    // NestJS returns: { success, data: { user, accessToken } }
    const accessToken = data?.data?.accessToken;
    const user = data?.data?.user;

    const response = NextResponse.json(
      { accessToken, user },
      { status: 200 }
    );

    if (accessToken) {
      // Readable by JS (for axios Authorization header)
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

    // Forward refreshToken from NestJS Set-Cookie header
    const setCookieHeader = apiResponse.headers.get("set-cookie");
    if (setCookieHeader) {
      response.headers.append("Set-Cookie", setCookieHeader);
    }

    return response;
  } catch (error) {
    console.error("Login proxy error:", error);
    return NextResponse.json(
      { message: "Ошибка при обработке запроса авторизации" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
