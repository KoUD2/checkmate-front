import { buildCoverage, isCoveredAt, Interval } from './coverage';
import { hashText, isSignificant, normalize } from './text-hash';
import { Week, enumerateWeeks } from './weeks';
import { tariffForChecks } from './tariff';

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

export interface PacWeek {
  week: string;
  pac: number;
  new: number;
  retained: number;
  reactivated: number;
}

export interface MetricsResponse {
  range: { from: string; to: string; weeks: string[] };
  nsm: { pacByWeek: PacWeek[]; current: number; wowGrowthPct: number | null };
  newPac: {
    registrationsByWeek: { week: string; count: number }[];
    byChannel: Record<string, number>;
    activationRate: number;
    freeToPaidCR: number;
    tariffMix: Record<string, number>;
  };
  retained: {
    subscriptionRetentionByWeek: { week: string; rate: number | null }[];
    arpcByWeek: { week: string; arpc: number }[];
    quality: { dislikeRate: number | null; avgScore: number | null };
  };
  backup: {
    revenue: number;
    mrrEquivalent: number;
    dauByDay: { day: string; count: number }[];
    wauByWeek: { week: string; count: number }[];
  };
  guardrails: {
    duplicateTextRate: number;
    medianTextLength: number;
    shortCheckRate: number;
  };
}

export interface MetricsInput {
  users: RawUser[];
  tasks: RawTask[];
  payments: RawPayment[];
}

const MS_DAY = 86400000;

export function computeMetrics(
  input: MetricsInput,
  range: { from: Date; to: Date },
): MetricsResponse {
  const { users, tasks, payments } = input;
  const weeks = enumerateWeeks(range.from, range.to);
  const coverageByUser = buildCoverageByUser(payments);
  const succeeded = payments.filter((p) => p.status === 'SUCCEEDED');

  // --- PAC series with new/retained/reactivated ---
  const everPac = new Set<string>();
  let prevPac = new Set<string>();
  const pacByWeek: PacWeek[] = weeks.map((week) => {
    const pac = pacUserIdsForWeek(coverageByUser, tasks, week);
    let isNew = 0;
    let retained = 0;
    let reactivated = 0;
    for (const id of pac) {
      if (!everPac.has(id)) isNew++;
      else if (prevPac.has(id)) retained++;
      else reactivated++;
    }
    for (const id of pac) everPac.add(id);
    prevPac = pac;
    return { week: week.key, pac: pac.size, new: isNew, retained, reactivated };
  });
  const current = pacByWeek.length ? pacByWeek[pacByWeek.length - 1].pac : 0;
  let wowGrowthPct: number | null = null;
  if (pacByWeek.length >= 2) {
    const prev = pacByWeek[pacByWeek.length - 2].pac;
    wowGrowthPct = prev === 0 ? null : ((current - prev) / prev) * 100;
  }

  // --- registrations + channel ---
  const usersInRange = users.filter(
    (u) =>
      u.createdAt.getTime() >= range.from.getTime() &&
      u.createdAt.getTime() <= range.to.getTime(),
  );
  const registrationsByWeek = weeks.map((week) => ({
    week: week.key,
    count: usersInRange.filter(
      (u) =>
        u.createdAt.getTime() >= week.start.getTime() &&
        u.createdAt.getTime() < week.end.getTime(),
    ).length,
  }));
  const byChannel: Record<string, number> = { referral: 0, social: 0, direct: 0 };
  for (const u of usersInRange) byChannel[channelOf(u)]++;

  // --- activation: >=1 check within 7 days of registration ---
  const firstCheckAt = new Map<string, number>();
  for (const t of tasks) {
    const cur = firstCheckAt.get(t.userId);
    const ts = t.createdAt.getTime();
    if (cur === undefined || ts < cur) firstCheckAt.set(t.userId, ts);
  }
  const activated = (u: RawUser): boolean => {
    const fc = firstCheckAt.get(u.id);
    return fc !== undefined && fc - u.createdAt.getTime() <= 7 * MS_DAY && fc >= u.createdAt.getTime();
  };
  const activatedUsers = usersInRange.filter(activated);
  const activationRate = usersInRange.length
    ? activatedUsers.length / usersInRange.length
    : 0;

  // --- free -> paid: activated users with a succeeded payment within 30d of activation ---
  const paidAt = new Map<string, number>();
  for (const p of succeeded) {
    const t = (p.updatedAt ?? p.createdAt).getTime();
    const cur = paidAt.get(p.userId);
    if (cur === undefined || t < cur) paidAt.set(p.userId, t);
  }
  let converted = 0;
  for (const u of activatedUsers) {
    const fc = firstCheckAt.get(u.id)!;
    const pay = paidAt.get(u.id);
    if (pay !== undefined && pay - fc <= 30 * MS_DAY && pay >= fc) converted++;
  }
  const freeToPaidCR = activatedUsers.length ? converted / activatedUsers.length : 0;

  // --- tariff mix (succeeded payments in range) ---
  const tariffMix: Record<string, number> = {};
  for (const p of succeeded) {
    const t = (p.updatedAt ?? p.createdAt).getTime();
    if (t < range.from.getTime() || t > range.to.getTime()) continue;
    const name = tariffForChecks(p.checksToAdd);
    tariffMix[name] = (tariffMix[name] ?? 0) + 1;
  }

  // --- subscription retention: paid at end of W-1 still paid at end of W ---
  const subscriptionRetentionByWeek = weeks.map((week, i) => {
    if (i === 0) return { week: week.key, rate: null as number | null };
    const prevWeek = weeks[i - 1];
    const prevEnd = new Date(prevWeek.end.getTime() - 1);
    const curEnd = new Date(week.end.getTime() - 1);
    let denom = 0;
    let numer = 0;
    for (const [, intervals] of coverageByUser) {
      if (isCoveredAt(intervals, prevEnd)) {
        denom++;
        if (isCoveredAt(intervals, curEnd)) numer++;
      }
    }
    return { week: week.key, rate: denom === 0 ? null : numer / denom };
  });

  // --- ARPC: avg unique significant checks per paid user per week ---
  const arpcByWeek = weeks.map((week) => {
    const weekEnd = new Date(week.end.getTime() - 1);
    let paidCount = 0;
    let total = 0;
    for (const [userId, intervals] of coverageByUser) {
      if (!isCoveredAt(intervals, weekEnd)) continue;
      paidCount++;
      total += uniqueSignificantHashes(tasks, userId, week.start, week.end).size;
    }
    return { week: week.key, arpc: paidCount === 0 ? 0 : total / paidCount };
  });

  // --- quality proxy ---
  let likes = 0;
  let dislikes = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  for (const t of tasks) {
    const ts = t.createdAt.getTime();
    if (ts < range.from.getTime() || ts > range.to.getTime()) continue;
    if (t.userRating === 'LIKE') likes++;
    else if (t.userRating === 'DISLIKE') dislikes++;
    if (t.totalScore !== null && t.totalScore !== undefined) {
      scoreSum += t.totalScore;
      scoreCount++;
    }
  }
  const quality = {
    dislikeRate: likes + dislikes === 0 ? null : dislikes / (likes + dislikes),
    avgScore: scoreCount === 0 ? null : scoreSum / scoreCount,
  };

  // --- backup: revenue, MRR-equiv, DAU/WAU ---
  let revenue = 0;
  for (const p of succeeded) {
    const t = (p.updatedAt ?? p.createdAt).getTime();
    if (t >= range.from.getTime() && t <= range.to.getTime()) revenue += Number(p.amount);
  }
  const mrrFrom = range.to.getTime() - 30 * MS_DAY;
  let mrrEquivalent = 0;
  for (const p of succeeded) {
    const t = (p.updatedAt ?? p.createdAt).getTime();
    if (t > mrrFrom && t <= range.to.getTime()) mrrEquivalent += Number(p.amount);
  }
  const dauMap = new Map<string, Set<string>>();
  for (const t of tasks) {
    const ts = t.createdAt.getTime();
    if (ts < range.from.getTime() || ts > range.to.getTime()) continue;
    const day = new Date(t.createdAt.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const set = dauMap.get(day) ?? new Set<string>();
    set.add(t.userId);
    dauMap.set(day, set);
  }
  const dauByDay = [...dauMap.entries()]
    .map(([day, set]) => ({ day, count: set.size }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const wauByWeek = weeks.map((week) => {
    const set = new Set<string>();
    for (const t of tasks) {
      const ts = t.createdAt.getTime();
      if (ts >= week.start.getTime() && ts < week.end.getTime()) set.add(t.userId);
    }
    return { week: week.key, count: set.size };
  });

  // --- guardrails ---
  let significantCount = 0;
  let duplicateCount = 0;
  let withTextCount = 0;
  let shortCount = 0;
  const lengths: number[] = [];
  const perUserHashCounts = new Map<string, Map<string, number>>();
  for (const t of tasks) {
    const ts = t.createdAt.getTime();
    if (ts < range.from.getTime() || ts > range.to.getTime()) continue;
    const text = checkText(t);
    if (text === null) continue;
    withTextCount++;
    const len = normalize(text).length;
    lengths.push(len);
    if (!isSignificant(text)) {
      shortCount++;
      continue;
    }
    significantCount++;
    const h = hashText(text);
    const userMap = perUserHashCounts.get(t.userId) ?? new Map<string, number>();
    const prev = userMap.get(h) ?? 0;
    userMap.set(h, prev + 1);
    perUserHashCounts.set(t.userId, userMap);
    if (prev >= 1) duplicateCount++; // this occurrence is a repeat
  }
  lengths.sort((a, b) => a - b);
  const medianTextLength = lengths.length
    ? lengths.length % 2
      ? lengths[(lengths.length - 1) / 2]
      : (lengths[lengths.length / 2 - 1] + lengths[lengths.length / 2]) / 2
    : 0;
  const guardrails = {
    duplicateTextRate: significantCount === 0 ? 0 : duplicateCount / significantCount,
    medianTextLength,
    shortCheckRate: withTextCount === 0 ? 0 : shortCount / withTextCount,
  };

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString(), weeks: weeks.map((w) => w.key) },
    nsm: { pacByWeek, current, wowGrowthPct },
    newPac: { registrationsByWeek, byChannel, activationRate, freeToPaidCR, tariffMix },
    retained: { subscriptionRetentionByWeek, arpcByWeek, quality },
    backup: { revenue, mrrEquivalent, dauByDay, wauByWeek },
    guardrails,
  };
}
