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
  const [vkLoading, setVkLoading] = useState(false);
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
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
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

  const handleVk = async () => {
    setVkLoading(true);
    try {
      const res = await api.get<{ url: string }>("/auth/vk/init");
      window.location.href = res.data.url;
    } catch {
      onMessage("Не удалось инициировать подключение ВКонтакте.");
      setVkLoading(false);
    }
  };

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
        <button
          className={`${styles.btn} ${styles.btn_vk} ${user?.vkId ? styles.btn_connected : ""}`}
          onClick={handleVk}
          disabled={vkLoading || !!user?.vkId}
        >
          {user?.vkId ? "ВКонтакте подключён" : vkLoading ? "Загрузка..." : "ВКонтакте"}
        </button>

        <div className={styles.tg_wrapper}>
          {user?.telegramId ? (
            <button className={`${styles.btn} ${styles.btn_tg} ${styles.btn_connected}`} disabled>
              Telegram подключён
            </button>
          ) : tgLoading ? (
            <button className={`${styles.btn} ${styles.btn_tg}`} disabled>
              Загрузка...
            </button>
          ) : (
            <div ref={tgContainerRef} className={styles.tg_widget} />
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
