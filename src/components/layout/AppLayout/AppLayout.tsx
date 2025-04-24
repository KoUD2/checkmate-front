"use client";

import { usePathname } from "next/navigation";
import { FC, PropsWithChildren } from "react";
import MainLayout from "../MainLayout/MainLayout";

const AUTH_PATHS = ["/login", "/register"];

const AppLayout: FC<PropsWithChildren> = ({ children }) => {
  const pathname = usePathname();

  // Проверяем, является ли текущий путь страницей аутентификации
  const isAuthPage = AUTH_PATHS.includes(pathname);

  return isAuthPage ? <>{children}</> : <MainLayout>{children}</MainLayout>;
};

export default AppLayout;
