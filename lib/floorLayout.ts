/** ตำแหน่งโต๊ะบนผังร้าน — Kitchen เป็นป้ายทิศทาง ไม่ใช่โต๊ะ */
export const FLOOR_KITCHEN_AREA = 'kitchen';

/** grid-area name → หมายเลขโต๊ะ */
export const FLOOR_TABLE_AREAS: Record<string, number> = {
  t1: 1,
  t2: 2,
  t3: 3,
  t4: 4,
  t5: 5,
  t6: 6,
  t7: 7,
};

/**
 * ผังตามแบบร้าน:
 *   Kitchen (เต็มแถว)
 *   3 | 2 | 1
 *   4 | 7 (กว้าง 2 ช่อง)
 *   5 |
 *   6 |
 */
export const FLOOR_GRID_TEMPLATE_AREAS = `
  "kitchen kitchen kitchen"
  "t3 t2 t1"
  "t4 t7 t7"
  "t5 . ."
  "t6 . ."
`;

export const FLOOR_TABLE_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;
