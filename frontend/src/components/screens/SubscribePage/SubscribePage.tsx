"use client";

import { useAuth } from "@/hooks/useAuth";
import paymentService from "@/services/payment.service";
import { FC, useEffect, useState } from "react";
import styles from "./SubscribePage.module.css";
import SocialConnect from "./ui/SocialConnect/SocialConnect";

const PLANS = [
  { name: "Lite", price: 149, checks: 10 },
  { name: "Plus", price: 549, checks: 50 },
  { name: "Pro", price: 1449, checks: 200 },
  { name: "Ultra", price: 3990, checks: 600 },
  { name: "Mega", price: 14490, checks: 2400 },
];

const SubscribePage: FC = () => {
  const { user, refreshUser } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [socialMessage, setSocialMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const social = params.get("social");
    if (social === "success") {
      setSocialMessage("Соцсеть подключена! Начислено 2 бесплатных проверки.");
      refreshUser();
      window.history.replaceState({}, "", "/subscribe");
    } else if (social === "error") {
      const reason = params.get("reason");
      if (reason === "already_used") {
        setSocialMessage("Этот аккаунт уже привязан к другому пользователю.");
      } else {
        setSocialMessage("Не удалось подключить соцсеть. Попробуйте ещё раз.");
      }
      window.history.replaceState({}, "", "/subscribe");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async (plan: { name: string; price: number; checks: number }) => {
    setLoadingPlan(plan.name);
    try {
      const { confirmationUrl } = await paymentService.createPayment(
        plan.price,
        plan.checks,
      );
      window.open(confirmationUrl, "_blank");
    } catch {
      // ignore
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoSuccess(null);
    setPromoError(null);
    try {
      await paymentService.activatePromo(promoCode.trim());
      setPromoSuccess("Промокод активирован!");
      setPromoCode("");
      await refreshUser();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setPromoError(msg || "Неверный или истёкший промокод");
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
      <div className={styles.plans}>
        {PLANS.map((plan) => {
          const isPro = plan.name === "Pro";
          return (
            <div
              key={plan.name}
              className={`${styles.card} ${isPro ? styles.card_pro : ""}`}
            >
              <div className={styles.card__name}>{plan.name}</div>
              <div className={styles["card__price-row"]}>
                <span className={styles.card__price}>
                  {String(plan.price).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")}
                </span>
                <span className={styles.card__currency}>₽</span>
              </div>
              <div className={styles.card__checks}>{plan.checks} проверок</div>
              <button
                className={styles.card__button}
                onClick={() => handleBuy(plan)}
                disabled={loadingPlan === plan.name}
              >
                {loadingPlan === plan.name ? "Загрузка..." : "Оформить"}
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.divider} />

      <div className={styles["promo-section"]}>
        <div className={styles["promo-title"]}>Промокод</div>
        <div className={styles["promo-row"]}>
          <input
            className={styles["promo-input"]}
            placeholder="Введите промокод"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePromo()}
          />
          <button
            className={styles["promo-button"]}
            onClick={handlePromo}
            disabled={promoLoading || !promoCode.trim()}
          >
            {promoLoading ? "..." : "Активировать"}
          </button>
        </div>
        {promoSuccess && (
          <div className={styles["promo-success"]}>{promoSuccess}</div>
        )}
        {promoError && (
          <div className={styles["promo-error"]}>{promoError}</div>
        )}
      </div>

      <div className={styles.divider} />

      <SocialConnect user={user} onMessage={setSocialMessage} />

      {socialMessage && (
        <div
          className={
            socialMessage.includes("подключена")
              ? styles["promo-success"]
              : styles["promo-error"]
          }
          style={{ width: "100%", maxWidth: "44vw" }}
        >
          {socialMessage}
        </div>
      )}

      <div className={styles.divider} />

      <div className={styles.status}>
        Осталось проверок:{" "}
        <span className={styles.status__value}>
          {user?.freeChecksLeft ?? 0}
        </span>
      </div>
      </div>
    </div>
  );
};

export default SubscribePage;
