"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import tokenService from "@/services/token.service";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      console.log("[AuthGuard] Checking authentication...");
      try {
        // Проверяем наличие токена
        const hasToken = tokenService.isLoggedIn();
        console.log(`[AuthGuard] Has token: ${hasToken}`);

        if (!hasToken) {
          console.log("[AuthGuard] No token found, redirecting to login");
          router.push("/login");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("[AuthGuard] Auth check error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Также проверяем авторизацию при фокусе на окне (если пользователь вернулся на вкладку)
    const handleFocus = () => {
      console.log("[AuthGuard] Window focused, checking auth...");
      checkAuth();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [router]);

  // Если проверка еще не завершена, показываем индикатор загрузки
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Если пользователь авторизован, показываем защищенный контент
  return isAuthenticated ? <>{children}</> : null;
};

export default AuthGuard;
