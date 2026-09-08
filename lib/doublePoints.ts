export const DEFAULT_ORG_TIMEZONE = 'Asia/Bangkok';

/** แปลงวันที่ปัจจุบันตาม timezone ร้าน → YYYY-MM-DD */
export function todayInTimezone(timezone: string, now = new Date()): string {
  return now.toLocaleDateString('en-CA', {
    timeZone: timezone?.trim() || DEFAULT_ORG_TIMEZONE,
  });
}

export function parseDoublePointsDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d),
  );
}

/** วันนี้เป็น Double points day หรือไม่ — logic เดียวกับ is_double_points_active() */
export function isDoublePointsActive(
  enabled: boolean,
  dates: unknown,
  timezone = DEFAULT_ORG_TIMEZONE,
  now = new Date(),
): boolean {
  if (!enabled) return false;
  const today = todayInTimezone(timezone, now);
  return parseDoublePointsDates(dates).includes(today);
}

export function sortDoublePointsDates(dates: string[]): string[] {
  return [...dates].sort();
}

export function toggleDoublePointsDate(dates: string[], date: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return dates;
  if (dates.includes(date)) {
    return dates.filter(d => d !== date);
  }
  return sortDoublePointsDates([...dates, date]);
}
