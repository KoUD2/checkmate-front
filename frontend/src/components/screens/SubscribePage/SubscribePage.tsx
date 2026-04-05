"use client";

import { useAuth } from "@/hooks/useAuth";
import paymentService from "@/services/payment.service";
import { FC, useState } from "react";
import MainTitle from "../../ui/MainTitle/MainTitle";
import styles from "./SubscribePage.module.css";

type Period = "month" | "year";

const PLANS = {
  month: [
    { name: "Plus", price: 549, checks: 50, days: 30 },
    { name: "Pro", price: 990, checks: 200, days: 30 },
  ],
  year: [
    { name: "Plus", price: 5490, checks: 600, days: 365 },
    { name: "Pro", price: 8900, checks: 2400, days: 365 },
  ],
};

const SubscribePage: FC = () => {
  const { user, refreshUser } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const handleBuy = async (plan: {
    name: string;
    price: number;
    checks: number;
    days: number;
  }) => {
    const key = `${plan.name}-${period}`;
    setLoadingPlan(key);
    try {
      const { confirmationUrl } = await paymentService.createPayment(
        plan.price,
        plan.days,
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

  const plans = PLANS[period];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ru-RU");
  };

  return (
    <div className={styles.page}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${period === "month" ? styles.tab_active : ""}`}
          onClick={() => setPeriod("month")}
        >
          Месяц
        </button>
        <button
          className={`${styles.tab} ${period === "year" ? styles.tab_active : ""}`}
          onClick={() => setPeriod("year")}
        >
          Год
        </button>
      </div>

      <div className={styles.plans}>
        {plans.map((plan) => {
          const key = `${plan.name}-${period}`;
          const isPro = plan.name === "Pro";
          return (
            <div
              key={key}
              className={`${styles.card} ${isPro ? styles.card_pro : ""}`}
            >
              <div className={styles.card__name}>{plan.name}</div>
              <div className={styles["card__price-row"]}>
                <span className={styles.card__price}>
                  {plan.price.toLocaleString("ru-RU")}
                </span>
                <span className={styles.card__currency}>₽</span>
                <span className={styles.card__period}>
                  / {period === "month" ? "мес" : "год"}
                </span>
              </div>
              <div className={styles.card__checks}>{plan.checks} проверок</div>
              <button
                className={styles.card__button}
                onClick={() => handleBuy(plan)}
                disabled={loadingPlan === key}
              >
                {loadingPlan === key ? "Загрузка..." : "Оформить"}
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

      <div className={styles.status}>
        Осталось проверок:{" "}
        <span className={styles.status__value}>
          {user?.freeChecksLeft ?? 0}
        </span>
      </div>
      {user?.subscription?.isActive && (
        <div className={styles.status}>
          Подписка активна до:{" "}
          <span className={styles.status__value}>
            {formatDate(user.subscription.expiresAt ?? null)}
          </span>
        </div>
      )}
    </div>
  );
};

export default SubscribePage;
