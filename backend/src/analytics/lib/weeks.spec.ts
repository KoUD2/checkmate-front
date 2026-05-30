import { mskWeekStart, mskDateKey, enumerateWeeks } from './weeks';

describe('weeks', () => {
  it('mskWeekStart snaps to Monday 00:00 MSK', () => {
    // 2026-05-30 is a Saturday. MSK week starts Monday 2026-05-25 00:00 MSK = 2026-05-24T21:00:00Z
    const start = mskWeekStart(new Date('2026-05-30T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-05-24T21:00:00.000Z');
  });

  it('mskWeekStart handles an instant just after MSK midnight Monday', () => {
    // Monday 2026-05-25 00:30 MSK = 2026-05-24T21:30:00Z -> same week start
    const start = mskWeekStart(new Date('2026-05-24T21:30:00Z'));
    expect(start.toISOString()).toBe('2026-05-24T21:00:00.000Z');
  });

  it('mskWeekStart handles an instant just before MSK midnight Monday (previous week)', () => {
    // 2026-05-24T20:59:00Z = Sunday 23:59 MSK -> previous week start (Mon 2026-05-18)
    const start = mskWeekStart(new Date('2026-05-24T20:59:00Z'));
    expect(start.toISOString()).toBe('2026-05-17T21:00:00.000Z');
  });

  it('mskDateKey returns the MSK calendar date of the week start', () => {
    const start = mskWeekStart(new Date('2026-05-30T12:00:00Z'));
    expect(mskDateKey(start)).toBe('2026-05-25');
  });

  it('enumerateWeeks yields contiguous weeks covering the range', () => {
    const weeks = enumerateWeeks(
      new Date('2026-05-01T00:00:00Z'),
      new Date('2026-05-30T00:00:00Z'),
    );
    expect(weeks.map((w) => w.key)).toEqual([
      '2026-04-27', '2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25',
    ]);
    // each end equals the next start
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i].start.getTime()).toBe(weeks[i - 1].end.getTime());
    }
    // weeks are 7 days long
    expect(weeks[0].end.getTime() - weeks[0].start.getTime()).toBe(7 * 86400000);
  });
});
