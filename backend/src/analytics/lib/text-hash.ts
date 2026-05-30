import { createHash } from 'crypto';

const MIN_SIGNIFICANT_LENGTH = 50;

export function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function isSignificant(
  text: string | null | undefined,
  min = MIN_SIGNIFICANT_LENGTH,
): boolean {
  if (!text) return false;
  return normalize(text).length >= min;
}

export function hashText(text: string): string {
  return createHash('sha256').update(normalize(text)).digest('hex');
}
