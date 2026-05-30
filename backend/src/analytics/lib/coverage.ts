export interface CoveragePayment {
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED' | string;
  daysToAdd: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interval {
  start: Date;
  end: Date;
}

/** When the payment flipped to SUCCEEDED. updatedAt is bumped by the status update. */
function successTime(p: CoveragePayment): Date {
  return p.updatedAt ?? p.createdAt;
}

/** Mirrors addDaysToSubscription via setDate (server-local), matching production. */
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/**
 * Reconstruct subscription coverage intervals from a user's payments.
 * Mirrors SubscriptionsService.addDaysToSubscription:
 *   base = (active && expiresAt > now) ? expiresAt : now; expiresAt = base + days
 */
export function buildCoverage(payments: CoveragePayment[]): Interval[] {
  const relevant = payments
    .filter((p) => p.status === 'SUCCEEDED' && p.daysToAdd > 0)
    .map((p) => ({ t: successTime(p), days: p.daysToAdd }))
    .sort((a, b) => a.t.getTime() - b.t.getTime());

  const intervals: Interval[] = [];
  let expiry: Date | null = null;

  for (const p of relevant) {
    if (expiry === null || expiry.getTime() < p.t.getTime()) {
      // fresh start (no active coverage at success time)
      expiry = addDays(p.t, p.days);
      intervals.push({ start: p.t, end: expiry });
    } else {
      // extend from current expiry
      expiry = addDays(expiry, p.days);
      intervals[intervals.length - 1].end = expiry;
    }
  }
  return intervals;
}

/** Covered if `at` falls in any interval: start <= at < end. */
export function isCoveredAt(intervals: Interval[], at: Date): boolean {
  const t = at.getTime();
  return intervals.some((iv) => iv.start.getTime() <= t && t < iv.end.getTime());
}
