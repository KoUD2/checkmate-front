import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Use the correct backend URL
    const apiUrl = "https://checkmateai.ru/auth/logout";
    console.log(`Forwarding logout request to: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`API response status: ${apiResponse.status}`);

    // Create response
    const response = new NextResponse(null, {
      status: apiResponse.ok ? 200 : apiResponse.status,
    });

    // Add CORS headers
    const origin = request.headers.get("origin") || "";
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Clear cookies on logout
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  } catch (error) {
    console.error("Logout proxy error:", error);
    // Add more detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { message: "Ошибка при обработке запроса выхода" },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "";

  // Create response with CORS headers
  const response = new NextResponse(null, {
    status: 200,
  });

  // Set CORS headers
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return response;
}
