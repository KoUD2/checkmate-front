"use client";

import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import Link from "next/link";
import { FC, PropsWithChildren, useState } from "react";
import Logo from "../../../shared/images/A_Logo.svg";
import styles from "./MainLayout.module.css";

function getInitials(name: string | undefined): string {
  if (!name) return "";
  const words = name.trim().split(" ");
  if (words.length === 1) {
    return words[0][0]?.toUpperCase() || "";
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

const MainLayout: FC<PropsWithChildren> = ({ children }) => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const pluralChecks = (n: number) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return `${n} проверок`;
    if (mod10 === 1) return `${n} проверка`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} проверки`;
    return `${n} проверок`;
  };

  const checksLabel = () => {
    if (!user) return null;
    return pluralChecks(user.freeChecksLeft);
  };

  const label = checksLabel();

  return (
    <div className={styles["main-layout-container"]}>
      <header>
        <div className={styles["main-layout"]}>
          <Link href="/">
            <div className={styles["main-layout__logo-container"]}>
              <Image
                src={Logo}
                alt="Логотип"
                className={styles["main-layout__logo"]}
              />
            </div>
          </Link>
          <div className={styles["main-layout__right"]}>
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className={styles["main-layout__checks"]}>
                Админка
              </Link>
            )}
            <Link href="/resources" className={styles["main-layout__checks"]}>
              Полезное
            </Link>
            {user && (
              <Link href="/referral" className={styles["main-layout__checks"]}>
                Пригласить друга
              </Link>
            )}
            {label && (
              <Link href="/subscribe" className={styles["main-layout__checks"]}>
                {label}
              </Link>
            )}
            <div className={styles["main-layout__greeting"]}>
              {user ? getInitials(`${user.firstName} ${user.lastName}`) : ""}
            </div>
            <button
              className={styles["main-layout__burger"]}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Меню"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className={styles["main-layout__mobile-nav"]}>
            {user?.role === 'ADMIN' && (
              <Link href="/admin" onClick={() => setMenuOpen(false)}>Админка</Link>
            )}
            <Link href="/resources" onClick={() => setMenuOpen(false)}>Полезное</Link>
            {user && (
              <Link href="/referral" onClick={() => setMenuOpen(false)}>Пригласить друга</Link>
            )}
            {label && (
              <Link href="/subscribe" onClick={() => setMenuOpen(false)}>{label}</Link>
            )}
          </nav>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
};

export default MainLayout;
