// app/api/refresh-token/route.ts
import jwt, { JwtPayload } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

// Интерфейс для декодированного токена
interface DecodedToken extends JwtPayload {
  id: number;
  username: string;
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Токен обновления отсутствует" },
        { status: 401 }
      );
    }

    // Проверяем refresh токен и типизируем как DecodedToken
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as DecodedToken;

    // Генерируем новый access токен
    const accessToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "15m" }
    );

    const response = NextResponse.json({ accessToken }, { status: 200 });

    // Устанавливаем новый access токен
    response.cookies.set({
      name: "accessToken",
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Ошибка обновления токена:", error);
    const response = NextResponse.json(
      { error: "Неверный токен обновления" },
      { status: 401 }
    );
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    return response;
  }
}
