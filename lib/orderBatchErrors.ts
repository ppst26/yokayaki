// =============================================================
// แปลงข้อความ exception จาก Postgres batch RPC เป็นข้อความไทย
// =============================================================

export function orderBatchErrorMessage(
  err: { message?: string },
  nameById: Map<number, string>
): string {
  const msg = err.message ?? '';

  if (msg.includes('insufficient_stock')) {
    const id = Number(msg.split(':').pop());
    const name = nameById.get(id) ?? `เมนู #${id}`;
    return `วัตถุดิบ/สินค้า "${name}" หมด หรือไม่เพียงพอ`;
  }
  if (msg.includes('menu_not_found')) {
    const id = Number(msg.split(':').pop());
    return `ไม่พบเมนู #${id}`;
  }
  if (msg.includes('invalid_table')) {
    return 'ไม่พบโต๊ะที่เลือก';
  }
  if (msg.includes('invalid_session') || msg.includes('session_not_active')) {
    return 'เซสชัน QR ไม่ถูกต้องหรือหมดอายุแล้ว';
  }
  if (msg.includes('session_expired')) {
    return 'เซสชัน QR หมดอายุแล้ว';
  }
  if (msg.includes('invalid_items') || msg.includes('invalid_item')) {
    return 'รายการสั่งอาหารไม่ถูกต้อง';
  }
  return 'ไม่สามารถสั่งอาหารได้';
}
