import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Создаем ответ
    const response = NextResponse.json(
      { success: true, message: "Successfully logged out" },
      { status: 200 }
    );

    // Очищаем куки с токенами через response
    response.cookies.set({
      name: "accessToken",
      value: "",
      expires: new Date(0),
      path: "/",
    });

    response.cookies.set({
      name: "refreshToken",
      value: "",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
    );
  }
}
