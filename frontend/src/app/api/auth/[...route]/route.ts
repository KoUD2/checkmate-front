import { NextRequest, NextResponse } from "next/server";

// Обработчик для preflight OPTIONS запросов (CORS)
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "";

  // Создаем ответ с CORS заголовками
  const response = new NextResponse(null, {
    status: 200,
  });

  // Устанавливаем CORS заголовки
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return response;
}
