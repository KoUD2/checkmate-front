import {
  RawTask,
  RawUser,
  RawPayment,
  channelOf,
  uniqueSignificantHashes,
  buildCoverageByUser,
  pacUserIdsForWeek,
  computeMetrics,
} from './metrics';
import { enumerateWeeks } from './weeks';

const LONG = 'a '.repeat(40).trim(); // 79 chars normalized -> significant

function task(userId: string, day: string, solution: string | null): RawTask {
  return {
    userId,
    solution,
    transcription: null,
    createdAt: new Date(day),
    userRating: null,
    totalScore: null,
  };
}

describe('metrics helpers', () => {
  it('channelOf classifies referral / social / direct', () => {
    const base = { id: 'u', createdAt: new Date(), referredByCode: null, vkId: null, telegramId: null, yandexId: null, isInternal: false, segment: null };
    expect(channelOf({ ...base, referredByCode: 'ABC' })).toBe('referral');
    expect(channelOf({ ...base, telegramId: '123' })).toBe('social');
    expect(channelOf(base)).toBe('direct');
  });

  it('uniqueSignificantHashes counts distinct significant texts in window', () => {
    const tasks = [
      task('u1', '2026-05-26T10:00:00Z', LONG + ' one'),
      task('u1', '2026-05-26T11:00:00Z', LONG + ' one'), // duplicate -> not unique
      task('u1', '2026-05-26T12:00:00Z', LONG + ' two'),
      task('u1', '2026-05-26T13:00:00Z', 'short'), // insignificant
      task('u2', '2026-05-26T10:00:00Z', LONG + ' three'), // other user
    ];
    const set = uniqueSignificantHashes(
      tasks, 'u1',
      new Date('2026-05-25T00:00:00Z'), new Date('2026-06-01T00:00:00Z'),
    );
    expect(set.size).toBe(2);
  });

  it('pacUserIdsForWeek requires active coverage AND >=3 unique checks', () => {
    // Week containing 2026-05-26: Mon 2026-05-25..06-01 (MSK)
    const week = enumerateWeeks(new Date('2026-05-26T00:00:00Z'), new Date('2026-05-26T00:00:00Z'))[0];
    const payments = [
      { userId: 'paid', status: 'SUCCEEDED' as const, amount: 549, daysToAdd: 30, checksToAdd: 50,
        createdAt: new Date('2026-05-20T00:00:00Z'), updatedAt: new Date('2026-05-20T00:00:00Z') },
    ];
    const coverageByUser = buildCoverageByUser(payments);
    const tasks = [
      task('paid', '2026-05-26T10:00:00Z', LONG + ' a'),
      task('paid', '2026-05-26T11:00:00Z', LONG + ' b'),
      task('paid', '2026-05-26T12:00:00Z', LONG + ' c'), // 3 unique -> PAC
      task('free', '2026-05-26T10:00:00Z', LONG + ' a'),
      task('free', '2026-05-26T11:00:00Z', LONG + ' b'),
      task('free', '2026-05-26T12:00:00Z', LONG + ' c'), // 3 unique but NOT paid
      task('lazy', '2026-05-26T10:00:00Z', LONG + ' a'), // paid? no
    ];
    const pac = pacUserIdsForWeek(coverageByUser, tasks, week);
    expect([...pac]).toEqual(['paid']);
  });
});

const LONG2 = 'b '.repeat(40).trim();

function user(id: string, createdAt: string, extra: Partial<RawUser> = {}): RawUser {
  return { id, createdAt: new Date(createdAt), referredByCode: null, vkId: null, telegramId: null, yandexId: null, isInternal: false, segment: null, ...extra };
}
function succ(userId: string, day: string): RawPayment {
  return { userId, status: 'SUCCEEDED', amount: 549, daysToAdd: 30, checksToAdd: 50, createdAt: new Date(day), updatedAt: new Date(day) };
}

describe('computeMetrics', () => {
  const range = { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-31T00:00:00Z') };

  it('computes PAC series, registrations, activation, free->paid, guardrails', () => {
    const users = [
      user('paid', '2026-05-05T09:00:00Z'),
      user('free', '2026-05-06T09:00:00Z', { referredByCode: 'AMB1' }),
    ];
    const payments = [succ('paid', '2026-05-11T00:00:00Z')]; // covers 05-11..06-10
    const tasks = [
      // paid: activates (1st check within 7d of reg) and is PAC in week of 05-18
      task('paid', '2026-05-07T10:00:00Z', LONG2 + ' x'), // activation check
      task('paid', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('paid', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('paid', '2026-05-18T12:00:00Z', LONG2 + ' c'),
      task('paid', '2026-05-18T13:00:00Z', LONG2 + ' c'), // duplicate -> guardrail
      // free: activates but never pays
      task('free', '2026-05-08T10:00:00Z', LONG2 + ' y'),
    ];

    const m = computeMetrics({ users, tasks, payments }, range);

    const wk = m.nsm.pacByWeek.find((w) => w.week === '2026-05-18');
    expect(wk?.pac).toBe(1);
    expect(wk?.new).toBe(1);

    expect(m.newPac.activationRate).toBeCloseTo(1.0, 5); // both users did a check within 7d
    expect(m.newPac.freeToPaidCR).toBeCloseTo(0.5, 5); // 1 of 2 activated users paid
    expect(m.newPac.byChannel.referral).toBe(1);
    expect(m.newPac.byChannel.direct).toBe(1);
    expect(m.newPac.tariffMix.Plus).toBe(1);

    // guardrail: 1 duplicate among paid's significant checks
    expect(m.guardrails.duplicateTextRate).toBeGreaterThan(0);
    expect(m.backup.revenue).toBe(549);
  });

  it('classifies retained vs reactivated across weeks', () => {
    const users = [user('p', '2026-05-01T00:00:00Z')];
    // Two coverage windows with a gap: pays 05-04 (covers..06-03). Single interval, but
    // simulate reactivation by being PAC, idle a week, PAC again.
    const payments = [succ('p', '2026-05-04T00:00:00Z')];
    const tasks = [
      // PAC week 05-04
      task('p', '2026-05-05T10:00:00Z', LONG2 + ' a'),
      task('p', '2026-05-05T11:00:00Z', LONG2 + ' b'),
      task('p', '2026-05-05T12:00:00Z', LONG2 + ' c'),
      // PAC week 05-11 (retained)
      task('p', '2026-05-12T10:00:00Z', LONG2 + ' a'),
      task('p', '2026-05-12T11:00:00Z', LONG2 + ' b'),
      task('p', '2026-05-12T12:00:00Z', LONG2 + ' c'),
    ];
    const m = computeMetrics({ users, tasks, payments },
      { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-17T00:00:00Z') });
    const w2 = m.nsm.pacByWeek.find((w) => w.week === '2026-05-11');
    expect(w2?.retained).toBe(1);
    expect(w2?.new).toBe(0);
  });

  it('counts reactivated PAC: PAC, idle week, PAC again', () => {
    const users = [user('r', '2026-05-01T00:00:00Z')];
    // Two coverage windows with a gap across week 05-11 (MSK weeks; week-end ~Sun 21:00Z):
    //   pay 05-04 (+7d) -> covers [05-04, 05-11) -> active at week-end of 05-04, expired by week-end of 05-11
    //   pay 05-18 (+7d) -> covers [05-18, 05-25) -> active at week-end of 05-18
    // Week 05-11 has no coverage at its week-end -> not PAC -> week 05-18 is a REACTIVATION.
    const payments: RawPayment[] = [
      { userId: 'r', status: 'SUCCEEDED', amount: 149, daysToAdd: 7, checksToAdd: 10,
        createdAt: new Date('2026-05-04T00:00:00Z'), updatedAt: new Date('2026-05-04T00:00:00Z') },
      { userId: 'r', status: 'SUCCEEDED', amount: 149, daysToAdd: 7, checksToAdd: 10,
        createdAt: new Date('2026-05-18T00:00:00Z'), updatedAt: new Date('2026-05-18T00:00:00Z') },
    ];
    const tasks = [
      // PAC in week 05-04
      task('r', '2026-05-05T10:00:00Z', LONG2 + ' a'),
      task('r', '2026-05-05T11:00:00Z', LONG2 + ' b'),
      task('r', '2026-05-05T12:00:00Z', LONG2 + ' c'),
      // checks in week 05-11 but NO coverage -> not PAC
      task('r', '2026-05-12T10:00:00Z', LONG2 + ' a'),
      task('r', '2026-05-12T11:00:00Z', LONG2 + ' b'),
      task('r', '2026-05-12T12:00:00Z', LONG2 + ' c'),
      // PAC again in week 05-18
      task('r', '2026-05-19T10:00:00Z', LONG2 + ' a'),
      task('r', '2026-05-19T11:00:00Z', LONG2 + ' b'),
      task('r', '2026-05-19T12:00:00Z', LONG2 + ' c'),
    ];
    const m = computeMetrics({ users, tasks, payments },
      { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-24T00:00:00Z') });
    const w0 = m.nsm.pacByWeek.find((w) => w.week === '2026-05-04');
    const w1 = m.nsm.pacByWeek.find((w) => w.week === '2026-05-11');
    const w2 = m.nsm.pacByWeek.find((w) => w.week === '2026-05-18');
    expect(w0?.new).toBe(1); // first ever PAC
    expect(w1?.pac).toBe(0); // idle (no coverage)
    expect(w2?.reactivated).toBe(1); // was PAC before, not last week
    expect(w2?.new).toBe(0);
    expect(w2?.retained).toBe(0);
  });

  it('excludes internal users and their tasks/payments from all metrics', () => {
    const range = { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-31T00:00:00Z') };
    const users = [
      user('real', '2026-05-05T09:00:00Z'),
      user('staff', '2026-05-05T09:00:00Z', { isInternal: true }),
    ];
    // Both pay (covers the PAC week of 05-18) and both make 3 unique checks that week.
    const payments = [succ('real', '2026-05-11T00:00:00Z'), succ('staff', '2026-05-11T00:00:00Z')];
    const tasks = [
      task('real', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('real', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('real', '2026-05-18T12:00:00Z', LONG2 + ' c'),
      task('staff', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('staff', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('staff', '2026-05-18T12:00:00Z', LONG2 + ' c'),
    ];

    const m = computeMetrics({ users, tasks, payments }, range);

    // PAC counts only the real user, not staff
    const wk = m.nsm.pacByWeek.find((w) => w.week === '2026-05-18');
    expect(wk?.pac).toBe(1);
    // registrations: only the real user is counted (its week is 2026-05-04)
    const totalRegs = m.newPac.registrationsByWeek.reduce((s, w) => s + w.count, 0);
    expect(totalRegs).toBe(1);
    // revenue: only the real user's payment (549), staff's excluded
    expect(m.backup.revenue).toBe(549);
    // tariff mix: one Plus (real), staff not counted
    expect(m.newPac.tariffMix.Plus).toBe(1);
  });

  it('reports segment distribution and PAC by segment, internal excluded', () => {
    const range = { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-31T00:00:00Z') };
    const users = [
      user('tut', '2026-05-05T09:00:00Z', { segment: 'TUTOR' }),
      user('stu', '2026-05-05T09:00:00Z', { segment: 'STUDENT' }),
      user('par', '2026-05-05T09:00:00Z', { segment: 'PARENT' }),
      user('unk', '2026-05-05T09:00:00Z'), // segment null -> unknown
      user('staff', '2026-05-05T09:00:00Z', { segment: 'TUTOR', isInternal: true }), // excluded
    ];
    // tut becomes PAC in week 05-18; staff would too but is internal.
    const payments = [succ('tut', '2026-05-11T00:00:00Z'), succ('staff', '2026-05-11T00:00:00Z')];
    const tasks = [
      task('tut', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('tut', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('tut', '2026-05-18T12:00:00Z', LONG2 + ' c'),
      task('staff', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('staff', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('staff', '2026-05-18T12:00:00Z', LONG2 + ' c'),
    ];

    const m = computeMetrics({ users, tasks, payments }, range);

    // distribution: 4 non-internal users (staff excluded)
    expect(m.segments.distribution).toEqual({ TUTOR: 1, STUDENT: 1, PARENT: 1, unknown: 1 });
    // PAC by segment over the period: only 'tut' (a TUTOR) is PAC; staff excluded
    expect(m.segments.pacBySegment).toEqual({ TUTOR: 1, STUDENT: 0, PARENT: 0, unknown: 0 });
  });
});
