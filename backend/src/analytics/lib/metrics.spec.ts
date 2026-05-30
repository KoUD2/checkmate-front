import {
  RawTask,
  channelOf,
  uniqueSignificantHashes,
  buildCoverageByUser,
  pacUserIdsForWeek,
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
    const base = { id: 'u', createdAt: new Date(), referredByCode: null, vkId: null, telegramId: null, yandexId: null };
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
