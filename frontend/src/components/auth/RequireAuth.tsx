"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[RequireAuth] Checking auth status:", {
      isAuthenticated,
      loading,
    });

    if (!loading && !isAuthenticated) {
      console.log("[RequireAuth] User not authenticated, redirecting to login");
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Показываем индикатор загрузки во время проверки
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Если пользователь аутентифицирован, показываем содержимое
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Возвращаем null, пока происходит переадресация
  return null;
};

export default RequireAuth;
