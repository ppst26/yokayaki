import { STORE_TIMEZONE } from '@/lib/menuPrice';

/** วันที่ปฏิทินใน timezone ร้าน (YYYY-MM-DD) */
export function formatStoreDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIMEZONE }).format(date);
}

/** ช่วง timestamptz สำหรับ query — ตรงกับปฏิทินร้าน ไม่ใช้ UTC จาก toISOString() */
export function storeTimestampRange(start: Date, end: Date) {
  const startDateStr = formatStoreDate(start);
  const endDateStr = formatStoreDate(end);
  return {
    startISO: `${startDateStr}T00:00:00+07:00`,
    endISO: `${endDateStr}T23:59:59.999+07:00`,
    startDateStr,
    endDateStr,
  };
}

/** แปลง created_at เป็นวันปฏิทินร้านสำหรับ group chart */
export function storeDateFromTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIMEZONE }).format(new Date(timestamp));
}

/** ชั่วโมงใน timezone ร้าน (0–23) */
export function storeHourFromTimestamp(timestamp: string): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: STORE_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(new Date(timestamp)),
  );
}
