import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log("Refresh request body:", JSON.stringify(requestBody));

    // Use the correct backend URL without api prefix
    const apiUrl = "https://checkmateai.ru/auth/refresh";
    console.log(`Forwarding refresh request to: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      credentials: "include",
    });

    console.log(`API response status: ${apiResponse.status}`);

    // Check if response is ok before parsing JSON
    if (!apiResponse.ok) {
      try {
        const errorText = await apiResponse.text();
        console.error(`API error response: ${apiResponse.status}`, errorText);
        return NextResponse.json(
          {
            message: `Ошибка обновления: ${apiResponse.status} - ${errorText}`,
          },
          { status: apiResponse.status }
        );
      } catch (e) {
        console.error("Failed to parse error response", e);
        return NextResponse.json(
          { message: `Ошибка обновления: ${apiResponse.status}` },
          { status: apiResponse.status }
        );
      }
    }

    // Parse response data
    let data;
    try {
      data = await apiResponse.json();
      console.log("API response data structure:", Object.keys(data));
    } catch (e) {
      console.error("Failed to parse JSON response", e);
      return NextResponse.json(
        { message: "Ошибка при обработке ответа сервера" },
        { status: 500 }
      );
    }

    // Create response
    const response = NextResponse.json(data, {
      status: apiResponse.status,
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

    // Set cookies if successful login with tokens
    if (apiResponse.ok && data.accessToken) {
      response.cookies.set({
        name: "accessToken",
        value: data.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60, // 15 minutes
        path: "/",
      });

      if (data.refreshToken) {
        response.cookies.set({
          name: "refreshToken",
          value: data.refreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: "/",
        });
      }
    }

    return response;
  } catch (error) {
    console.error("Refresh token proxy error:", error);
    // Add more detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { message: "Ошибка при обновлении токена" },
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
