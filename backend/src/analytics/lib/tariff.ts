export type TariffName = 'Lite' | 'Plus' | 'Pro' | 'Ultra' | 'Mega' | 'Custom';

// Matches admin.service.ts PACKAGE_NAMES and frontend PLANS catalog.
const BY_CHECKS: Record<number, TariffName> = {
  10: 'Lite',
  50: 'Plus',
  200: 'Pro',
  600: 'Ultra',
  2400: 'Mega',
};

export function tariffForChecks(checksToAdd: number): TariffName {
  return BY_CHECKS[checksToAdd] ?? 'Custom';
}
