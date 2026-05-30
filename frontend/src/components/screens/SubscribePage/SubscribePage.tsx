"use client";

import { useAuth } from "@/hooks/useAuth";
import paymentService from "@/services/payment.service";
import api from "@/shared/utils/api";
import { FC, useEffect, useState } from "react";
import styles from "./SubscribePage.module.css";
import SocialConnect from "./ui/SocialConnect/SocialConnect";

const PLANS = [
  { name: "Lite", price: 149, checks: 10, days: 14 },
  { name: "Plus", price: 549, checks: 50, days: 30 },
  { name: "Pro", price: 1449, checks: 200, days: 60 },
  { name: "Ultra", price: 3990, checks: 600, days: 90 },
  { name: "Mega", price: 14490, checks: 2400, days: 365 },
];

const LIMIT = 20;

const STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: "Оплачен",
  PENDING: "Ожидает",
  CANCELED: "Отменён",
};

interface MyPayment {
  id: string;
  status: "PENDING" | "SUCCEEDED" | "CANCELED";
  amount: number;
  checksToAdd: number;
  daysToAdd: number;
  createdAt: string;
}

const SubscribePage: FC = () => {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<"plans" | "history">("plans");

  // Plans tab state
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [socialMessage, setSocialMessage] = useState<string | null>(null);

  // History tab state
  const [payments, setPayments] = useState<MyPayment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const social = params.get("social");
    if (social === "success") {
      setSocialMessage("Соцсеть подключена! Начислено 3 бесплатных проверки.");
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

  useEffect(() => {
    if (tab !== "history") return;
    setHistoryLoading(true);
    api
      .get(`/payments/my?page=${page}&limit=${LIMIT}`)
      .then((res) => {
        const data = res.data?.data;
        setPayments(data?.payments ?? []);
        setTotalPages(data?.totalPages ?? 1);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [tab, page]);

  const handleBuy = async (plan: { name: string; price: number; checks: number; days: number }) => {
    setLoadingPlan(plan.name);
    try {
      const { confirmationUrl } = await paymentService.createPayment(
        plan.price,
        plan.checks,
        plan.days,
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

  const formatDateOnly = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const badgeClass = (status: string) => {
    if (status === "SUCCEEDED") return `${styles.badge} ${styles.badgeSucceeded}`;
    if (status === "PENDING") return `${styles.badge} ${styles.badgePending}`;
    return `${styles.badge} ${styles.badgeCanceled}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "plans" ? styles.tab_active : ""}`}
            onClick={() => setTab("plans")}
          >
            Тарифы
          </button>
          <button
            className={`${styles.tab} ${tab === "history" ? styles.tab_active : ""}`}
            onClick={() => setTab("history")}
          >
            История
          </button>
        </div>

        {/* ── PLANS TAB ── */}
        {tab === "plans" && (
          <>
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
                    <div className={styles.card__period}>{plan.days} дней</div>
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
              {promoSuccess && <div className={styles["promo-success"]}>{promoSuccess}</div>}
              {promoError && <div className={styles["promo-error"]}>{promoError}</div>}
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
              <span className={styles.status__value}>{user?.freeChecksLeft ?? 0}</span>
            </div>
            {user?.subscription?.isActive && user.subscription.expiresAt && (
              <div className={styles.status}>
                Подписка активна до:{" "}
                <span className={styles.status__value}>
                  {new Date(user.subscription.expiresAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <>
            {historyLoading ? (
              <div className={styles["history-empty"]}>Загрузка...</div>
            ) : payments.length === 0 ? (
              <div className={styles["history-empty"]}>Платежей пока нет</div>
            ) : (
              <>
                <div className={styles["history-table-wrapper"]}>
                  <table className={styles["history-table"]}>
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Проверок</th>
                        <th>Сумма</th>
                        <th>Действует до</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDate(p.createdAt)}</td>
                          <td>{p.checksToAdd}</td>
                          <td>
                            <span className={styles["history-amount"]}>
                              {Number(p.amount).toLocaleString("ru-RU")} ₽
                            </span>
                          </td>
                          <td>
                            {p.daysToAdd > 0 && p.status === "SUCCEEDED"
                              ? formatDateOnly(new Date(new Date(p.createdAt).getTime() + p.daysToAdd * 86400000))
                              : <span className={styles["history-dash"]}>—</span>}
                          </td>
                          <td>
                            <span className={badgeClass(p.status)}>
                              {STATUS_LABELS[p.status] ?? p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className={styles["history-pagination"]}>
                    <button
                      className={styles["history-page-btn"]}
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1}
                    >
                      ←
                    </button>
                    <span className={styles["history-page-info"]}>
                      {page} / {totalPages}
                    </span>
                    <button
                      className={styles["history-page-btn"]}
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default SubscribePage;
