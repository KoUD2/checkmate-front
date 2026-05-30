// Week bucketing in Europe/Moscow (UTC+3, no DST). A week runs Monday 00:00 MSK
// to the next Monday 00:00 MSK. Week key = MSK calendar date of the Monday.

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface Week {
  key: string; // YYYY-MM-DD (MSK date of the Monday)
  start: Date; // UTC instant of Monday 00:00 MSK
  end: Date; // UTC instant of the next Monday 00:00 MSK (exclusive)
}

/** UTC instant of the Monday-00:00-MSK that starts the week containing `d`. */
export function mskWeekStart(d: Date): Date {
  const msk = new Date(d.getTime() + MSK_OFFSET_MS);
  const dow = (msk.getUTCDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  msk.setUTCHours(0, 0, 0, 0);
  msk.setUTCDate(msk.getUTCDate() - dow);
  return new Date(msk.getTime() - MSK_OFFSET_MS);
}

/** MSK calendar date (YYYY-MM-DD) of a week-start instant. */
export function mskDateKey(instant: Date): string {
  return new Date(instant.getTime() + MSK_OFFSET_MS).toISOString().slice(0, 10);
}

/** Contiguous weeks whose union covers [from, to]. */
export function enumerateWeeks(from: Date, to: Date): Week[] {
  const weeks: Week[] = [];
  let start = mskWeekStart(from);
  const limit = to.getTime();
  while (start.getTime() <= limit) {
    const end = new Date(start.getTime() + WEEK_MS);
    weeks.push({ key: mskDateKey(start), start, end });
    start = end;
  }
  return weeks;
}
