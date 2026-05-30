import { buildCoverage, isCoveredAt, Interval } from './coverage';
import { hashText, isSignificant, normalize } from './text-hash';
import { Week } from './weeks';

export interface RawUser {
  id: string;
  createdAt: Date;
  referredByCode: string | null;
  vkId: string | null;
  telegramId: string | null;
  yandexId: string | null;
}

export interface RawTask {
  userId: string;
  solution: string | null;
  transcription: string | null;
  createdAt: Date;
  userRating: 'LIKE' | 'DISLIKE' | null;
  totalScore: number | null;
}

export interface RawPayment {
  userId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED';
  amount: number;
  daysToAdd: number;
  checksToAdd: number;
  createdAt: Date;
  updatedAt: Date;
}

export function channelOf(u: RawUser): 'referral' | 'social' | 'direct' {
  if (u.referredByCode) return 'referral';
  if (u.vkId || u.telegramId || u.yandexId) return 'social';
  return 'direct';
}

/** Text used for a check: essay solution, falling back to audio transcription. */
export function checkText(t: RawTask): string | null {
  return t.solution ?? t.transcription ?? null;
}

/** Distinct significant-text hashes for `userId` within [start, end). */
export function uniqueSignificantHashes(
  tasks: RawTask[],
  userId: string,
  start: Date,
  end: Date,
): Set<string> {
  const set = new Set<string>();
  const s = start.getTime();
  const e = end.getTime();
  for (const t of tasks) {
    if (t.userId !== userId) continue;
    const ts = t.createdAt.getTime();
    if (ts < s || ts >= e) continue;
    const text = checkText(t);
    if (!isSignificant(text)) continue;
    set.add(hashText(text as string));
  }
  return set;
}

/** Coverage intervals per user, reconstructed from their payments. */
export function buildCoverageByUser(
  payments: RawPayment[],
): Map<string, Interval[]> {
  const byUser = new Map<string, RawPayment[]>();
  for (const p of payments) {
    const arr = byUser.get(p.userId) ?? [];
    arr.push(p);
    byUser.set(p.userId, arr);
  }
  const out = new Map<string, Interval[]>();
  for (const [userId, ps] of byUser) out.set(userId, buildCoverage(ps));
  return out;
}

/** Users who are PAC in `week`: active coverage at week-end AND >=3 unique checks. */
export function pacUserIdsForWeek(
  coverageByUser: Map<string, Interval[]>,
  tasks: RawTask[],
  week: Week,
): Set<string> {
  const weekEnd = new Date(week.end.getTime() - 1); // last instant of the week
  const candidates = new Set<string>();
  const s = week.start.getTime();
  const e = week.end.getTime();
  for (const t of tasks) {
    const ts = t.createdAt.getTime();
    if (ts >= s && ts < e) candidates.add(t.userId);
  }
  const pac = new Set<string>();
  for (const userId of candidates) {
    const intervals = coverageByUser.get(userId);
    if (!intervals || !isCoveredAt(intervals, weekEnd)) continue;
    if (uniqueSignificantHashes(tasks, userId, week.start, week.end).size >= 3) {
      pac.add(userId);
    }
  }
  return pac;
}

// re-export for downstream use
export { normalize };
