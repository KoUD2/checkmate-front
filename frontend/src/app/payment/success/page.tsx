"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./success.module.css";

type VerifyStatus = "loading" | "succeeded" | "pending" | "canceled" | "error";

function PaymentSuccessContent() {
  const { refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");

  const [status, setStatus] = useState<VerifyStatus>(paymentId ? "loading" : "succeeded");

  useEffect(() => {
    if (!paymentId) {
      refreshUser();
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/payments/verify?paymentId=${paymentId}`);
        const json = await res.json();
        const paymentStatus: string = json?.data?.status ?? "error";

        if (paymentStatus === "succeeded") {
          await refreshUser();
          setStatus("succeeded");
        } else if (paymentStatus === "canceled") {
          setStatus("canceled");
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("error");
      }
    };

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  if (status === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}>⏳</div>
          <h1 className={styles.title}>Проверяем платёж...</h1>
          <p className={styles.text}>Пожалуйста, подождите несколько секунд.</p>
        </div>
      </div>
    );
  }

  if (status === "canceled") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon} style={{ background: "var(--error, #e53e3e)" }}>✕</div>
          <h1 className={styles.title}>Платёж отменён</h1>
          <p className={styles.text}>Средства не были списаны.</p>
          <Link href="/" className={styles.button}>На главную</Link>
        </div>
      </div>
    );
  }

  if (status === "error" || status === "pending") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon} style={{ background: "var(--warning, #d69e2e)" }}>!</div>
          <h1 className={styles.title}>Платёж обрабатывается</h1>
          <p className={styles.text}>
            Проверки будут начислены в течение нескольких минут. Если этого не произошло — обратитесь в поддержку.
          </p>
          <Link href="/" className={styles.button}>На главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✓</div>
        <h1 className={styles.title}>Оплата прошла успешно!</h1>
        <p className={styles.text}>Проверки добавлены на ваш аккаунт.</p>
        <Link href="/" className={styles.button}>На главную</Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p>Загрузка...</p>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
