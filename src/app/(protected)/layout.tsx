"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[ProtectedLayout] Auth status:", { isAuthenticated, loading });

    // Если не загружается и нет авторизации - редирект на логин
    if (!loading && !isAuthenticated) {
      console.log(
        "[ProtectedLayout] User not authenticated, redirecting to login"
      );
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Во время загрузки показываем индикатор
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Если пользователь аутентифицирован, показываем защищенное содержимое
  return isAuthenticated ? <>{children}</> : null;
}
