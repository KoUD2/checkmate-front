"use client";

import Link from "next/link";
import { FC } from "react";
import styles from "./SocialBonusPopup.module.css";

interface Props {
  onClose: () => void;
}

const SocialBonusPopup: FC<Props> = ({ onClose }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
        <div className={styles.icon}>🎁</div>
        <div className={styles.title}>Получите 3 бесплатные проверки!</div>
        <p className={styles.text}>
          Подключите <strong>Telegram</strong> или <strong>Яндекс ID</strong> в
          разделе подписки и получите <strong>3 бесплатные проверки</strong>{" "}
          прямо сейчас — совершенно бесплатно.
        </p>
        <Link href="/subscribe" className={styles.ctaBtn} onClick={onClose}>
          Перейти к подписке
        </Link>
      </div>
    </div>
  );
};

export default SocialBonusPopup;
