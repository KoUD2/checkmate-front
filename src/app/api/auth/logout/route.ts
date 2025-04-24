import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Создаем ответ
    const response = NextResponse.json(
      { success: true, message: "Successfully logged out" },
      { status: 200 }
    );

    // Добавляем CORS заголовки
    const origin = request.headers.get("origin") || "";
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
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

// Добавляем OPTIONS для предварительной проверки CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "";

  // Создаем ответ с CORS заголовками
  const response = new NextResponse(null, {
    status: 200,
  });

  // Устанавливаем CORS заголовки
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return response;
}
