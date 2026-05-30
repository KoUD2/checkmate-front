import { tariffForChecks } from './tariff';

describe('tariff', () => {
  it('maps known check counts to plan names', () => {
    expect(tariffForChecks(10)).toBe('Lite');
    expect(tariffForChecks(50)).toBe('Plus');
    expect(tariffForChecks(200)).toBe('Pro');
    expect(tariffForChecks(600)).toBe('Ultra');
    expect(tariffForChecks(2400)).toBe('Mega');
  });

  it('falls back to Custom for unknown counts', () => {
    expect(tariffForChecks(0)).toBe('Custom');
    expect(tariffForChecks(77)).toBe('Custom');
  });
});
