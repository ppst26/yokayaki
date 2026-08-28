/** ช่วง Happy Hour ตาม ROADMAP / agent/rules — 17:00–19:00 ร้าน */
export const STORE_TIMEZONE = 'Asia/Bangkok';
export const HAPPY_HOUR_START_HOUR = 17;
export const HAPPY_HOUR_END_HOUR = 19;

export interface MenuPriceFields {
  price: number;
  is_happy_hour?: boolean;
  happy_hour_price?: number | null;
}

/** เวลาร้าน (Asia/Bangkok) อยู่ในช่วง Happy Hour หรือไม่ */
export function isHappyHourNow(now = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: STORE_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(now),
  );
  return hour >= HAPPY_HOUR_START_HOUR && hour < HAPPY_HOUR_END_HOUR;
}

/** ราคาขายที่แสดง/ใส่ตะกร้า — สอดคล้องกับ `menu_item_sale_price` ใน DB */
export function menuItemSalePrice(item: MenuPriceFields, now = new Date()): number {
  if (
    item.is_happy_hour &&
    item.happy_hour_price != null &&
    item.happy_hour_price > 0 &&
    isHappyHourNow(now)
  ) {
    return item.happy_hour_price;
  }
  return item.price;
}
