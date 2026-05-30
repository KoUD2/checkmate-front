import { buildCoverage, isCoveredAt, CoveragePayment } from './coverage';

function pay(p: Partial<CoveragePayment>): CoveragePayment {
  return {
    status: 'SUCCEEDED',
    daysToAdd: 30,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...p,
  };
}

describe('coverage', () => {
  it('ignores non-succeeded and zero-day payments', () => {
    const intervals = buildCoverage([
      pay({ status: 'PENDING' }),
      pay({ status: 'CANCELED' }),
      pay({ daysToAdd: 0 }),
    ]);
    expect(intervals).toEqual([]);
  });

  it('builds a single interval for one payment using updatedAt as success time', () => {
    const intervals = buildCoverage([
      pay({
        daysToAdd: 30,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ]);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].start.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(intervals[0].end.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('extends from current expiry when a renewal arrives before expiry', () => {
    const intervals = buildCoverage([
      pay({ daysToAdd: 30, updatedAt: new Date('2026-01-01T00:00:00Z') }),
      pay({ daysToAdd: 30, updatedAt: new Date('2026-01-15T00:00:00Z') }), // still active
    ]);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    // 2026-01-01 +30 = 01-31, +30 = 03-02
    expect(intervals[0].end.toISOString()).toBe('2026-03-02T00:00:00.000Z');
  });

  it('starts a fresh interval (gap) when a payment arrives after expiry', () => {
    const intervals = buildCoverage([
      pay({ daysToAdd: 30, updatedAt: new Date('2026-01-01T00:00:00Z') }), // ends 01-31
      pay({ daysToAdd: 30, updatedAt: new Date('2026-03-01T00:00:00Z') }), // gap
    ]);
    expect(intervals).toHaveLength(2);
    expect(intervals[1].start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('isCoveredAt is inclusive of start and exclusive of end', () => {
    const intervals = buildCoverage([
      pay({ daysToAdd: 30, updatedAt: new Date('2026-01-01T00:00:00Z') }),
    ]);
    expect(isCoveredAt(intervals, new Date('2026-01-01T00:00:00Z'))).toBe(true);
    expect(isCoveredAt(intervals, new Date('2026-01-20T00:00:00Z'))).toBe(true);
    expect(isCoveredAt(intervals, new Date('2026-01-31T00:00:00Z'))).toBe(false);
    expect(isCoveredAt(intervals, new Date('2025-12-31T00:00:00Z'))).toBe(false);
  });
});
