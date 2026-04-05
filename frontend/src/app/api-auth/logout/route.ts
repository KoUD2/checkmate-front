import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("accessToken")?.value;
    const cookieHeader = request.headers.get("cookie") || "";

    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    }).catch(() => null); // Best effort — clear cookies regardless

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  } catch (error) {
    console.error("Logout proxy error:", error);
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    return response;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
