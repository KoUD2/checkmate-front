import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();

    // Перенаправляем запрос на реальный API
    const apiResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "https://checkmateai.ru"
      }/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Получаем данные ответа
    const data = await apiResponse.json();

    // Создаем ответ
    const response = NextResponse.json(data, {
      status: apiResponse.status,
    });

    // Если успешный ответ с токенами
    if (apiResponse.ok && data.accessToken) {
      // Устанавливаем куки для токенов
      response.cookies.set({
        name: "accessToken",
        value: data.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60, // 15 минут
        path: "/",
      });

      if (data.refreshToken) {
        response.cookies.set({
          name: "refreshToken",
          value: data.refreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 7 дней
          path: "/",
        });
      }
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
