import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();

    const apiResponse = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: data?.error?.message || "Ошибка регистрации" },
        { status: apiResponse.status }
      );
    }

    // NestJS returns: { success, data: { user, accessToken } }
    const accessToken = data?.data?.accessToken;
    const user = data?.data?.user;

    const response = NextResponse.json({ accessToken, user }, { status: 201 });

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

    const setCookieHeader = apiResponse.headers.get("set-cookie");
    if (setCookieHeader) {
      response.headers.append("Set-Cookie", setCookieHeader);
    }

    return response;
  } catch (error) {
    console.error("Signup proxy error:", error);
    return NextResponse.json(
      { message: "Ошибка при регистрации" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
