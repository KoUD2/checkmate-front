"use client";

import React, { useEffect, useState } from "react";
import tokenService from "@/services/token.service";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Функция проверки авторизации, упрощена для минимизации конфликтов с AuthContext
    const checkAuth = async () => {
      // Проверяем токен с небольшой задержкой
      try {
        console.log("[AuthGuard] Checking token availability");
        const token = tokenService.getAccessToken();

        if (!token) {
          console.log("[AuthGuard] No token found, not authorized");
          setAuthorized(false);
        } else {
          console.log("[AuthGuard] Token found, authorized");
          setAuthorized(true);
        }
      } catch (error) {
        console.error("[AuthGuard] Error checking authorization:", error);
        setAuthorized(false);
      }
    };

    // Даем время AuthContext выполнить свои проверки перед нашими
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Если не авторизован и не на странице логина, показываем заглушку
  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Проверка авторизации...</h2>
        </div>
      </div>
    );
  }

  // Если авторизован, показываем защищенный контент
  return <>{children}</>;
};

export default AuthGuard;
