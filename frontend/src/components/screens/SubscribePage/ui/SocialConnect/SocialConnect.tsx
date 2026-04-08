"use client";

import api from "@/shared/utils/api";
import { User } from "@/config/context/AuthContext";
import { FC, useEffect, useRef, useState } from "react";
import styles from "./SocialConnect.module.css";

interface Props {
  user: User | null;
  onMessage: (msg: string) => void;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const SocialConnect: FC<Props> = ({ user, onMessage }) => {
  const [yandexLoading, setYandexLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const tgContainerRef = useRef<HTMLDivElement>(null);

  const bonusGranted = user?.socialBonusGranted ?? false;

  // Telegram Login Widget
  useEffect(() => {
    if (!tgContainerRef.current) return;

    window.onTelegramAuth = async (tgUser: TelegramUser) => {
      setTgLoading(true);
      try {
        await api.post("/auth/telegram/connect", tgUser);
        onMessage("Соцсеть подключена! Начислено 2 бесплатных проверки.");
        // Reload to refresh user state
        window.location.reload();
      } catch (err: unknown) {
        const data = (err as { response?: { data?: { message?: string; error?: { message?: string } } } })
          ?.response?.data;
        const msg = data?.error?.message || data?.message;
        onMessage(msg || "Не удалось подключить Telegram. Попробуйте ещё раз.");
      } finally {
        setTgLoading(false);
      }
    };

    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    if (!botName) return;

    // Clear previous widget
    tgContainerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    tgContainerRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [onMessage]);

  const handleYandex = async () => {
    setYandexLoading(true);
    try {
      const res = await api.get<{ url: string }>("/auth/yandex/init");
      window.location.href = res.data.url;
    } catch {
      onMessage("Не удалось инициировать подключение Яндекс.");
      setYandexLoading(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.title}>
        {bonusGranted
          ? "Соцсеть подключена — бонус получен"
          : "Подключи соцсеть и получи 2 бесплатных проверки"}
      </div>
      {!bonusGranted && (
        <div className={styles.subtitle}>
          Подключение соцсети можно сделать только один раз. Бонус начисляется
          независимо от того, какую соцсеть вы выбрали.
        </div>
      )}
      <div className={styles.buttons}>
        <div className={styles.tg_wrapper}>
          {user?.telegramId ? (
            <button className={`${styles.btn} ${styles.btn_tg} ${styles.btn_connected}`} disabled>
              Telegram подключён
            </button>
          ) : (
            <div className={styles.tg_overlay_wrapper}>
              <button className={`${styles.btn} ${styles.btn_tg}`} disabled={tgLoading}>
                {tgLoading ? "Загрузка..." : "Telegram"}
              </button>
              <div ref={tgContainerRef} className={styles.tg_hidden} />
            </div>
          )}
        </div>

        <button
          className={`${styles.btn} ${styles.btn_yandex} ${user?.yandexId ? styles.btn_connected : ""}`}
          onClick={handleYandex}
          disabled={yandexLoading || !!user?.yandexId}
        >
          {user?.yandexId ? "Яндекс подключён" : yandexLoading ? "Загрузка..." : "Яндекс"}
        </button>
      </div>
    </div>
  );
};

export default SocialConnect;
