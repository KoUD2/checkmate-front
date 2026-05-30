import { normalize, isSignificant, hashText } from './text-hash';

describe('text-hash', () => {
  it('normalize lowercases, trims, collapses whitespace', () => {
    expect(normalize('  Hello   WORLD\n\tFoo ')).toBe('hello world foo');
  });

  it('isSignificant is false for null/undefined/short text', () => {
    expect(isSignificant(null)).toBe(false);
    expect(isSignificant(undefined)).toBe(false);
    expect(isSignificant('short')).toBe(false);
  });

  it('isSignificant is true at the 50-char normalized threshold', () => {
    const text = 'a '.repeat(25).trim(); // "a a a ..." normalized length 49
    expect(normalize(text).length).toBe(49);
    expect(isSignificant(text)).toBe(false);
    expect(isSignificant(text + ' bb')).toBe(true); // length 52
  });

  it('hashText is stable and ignores case/whitespace differences', () => {
    const a = hashText('The Quick Brown Fox jumps over the lazy dog again ok');
    const b = hashText('the   quick brown fox JUMPS over the lazy dog again ok');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashText differs for different content', () => {
    expect(hashText('alpha beta gamma delta epsilon zeta eta theta iota'))
      .not.toBe(hashText('alpha beta gamma delta epsilon zeta eta theta XXXX'));
  });
});
