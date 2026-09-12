/** หมวดหมู่เมนูมาตรฐาน — ลำดับตามที่แสดงใน POS / ลูกค้า / จัดการเมนู */
export const MENU_CATEGORIES = [
  'Recommend',
  'Appetizer',
  'ยำไทย',
  'อิ่มท้อง',
  'สลัด',
  'จานหลัก',
  'ซูชิ',
  'โรล',
  'มากิ',
  'เครื่องดื่ม',
  'อื่นๆ',
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const DEFAULT_MENU_CATEGORY: MenuCategory = 'Recommend';

/** หมวดที่ซ่อน/ลบออกจาก UI */
export const HIDDEN_MENU_CATEGORIES = new Set(['ทดสอบ']);

const CUSTOM_CATEGORIES_KEY = 'yokayaki_custom_menu_categories';

/** แปลงชื่อหมวดเก่า → ใหม่ (ให้ลำดับ chip ตรงกับมาตรฐาน) */
export function normalizeCategoryName(name: string): string {
  const trimmed = name.trim();
  switch (trimmed) {
    case 'กินเล่น':
    case 'ทานเล่น':
    case 'ย่าง':
    case 'เสียบไม้ย่าง':
    case 'เสียบไม้/ย่าง':
      return 'Appetizer';
    case 'ยำ':
      return 'ยำไทย';
    case 'ต้ม/แกง':
    case 'เส้น':
    case 'หม้อไฟ':
    case 'ข้าว':
      return 'อิ่มท้อง';
    case 'ซาซิมิ':
    case 'ซาชิมิ':
      return 'ซูชิ';
    default:
      return trimmed;
  }
}

/** อ่านหมวดที่เจ้าของร้านเพิ่มเอง (เก็บใน localStorage) */
export function readCustomMenuCategories(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed
      .map(v => normalizeCategoryName(String(v)))
      .filter(Boolean)
      .filter(c => !HIDDEN_MENU_CATEGORIES.has(c));

    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify([...new Set(cleaned)]));
    return [...new Set(cleaned)];
  } catch {
    return [];
  }
}

/** บันทึกหมวดที่เพิ่มเอง (ไม่ซ้ำกับมาตรฐาน) */
export function saveCustomMenuCategory(name: string): string[] {
  const trimmed = normalizeCategoryName(name);
  if (!trimmed || HIDDEN_MENU_CATEGORIES.has(trimmed)) {
    return readCustomMenuCategories();
  }

  const defaults = new Set(MENU_CATEGORIES.map(c => c.toLowerCase()));
  const existing = readCustomMenuCategories();
  if (defaults.has(trimmed.toLowerCase())) return existing;
  if (existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) return existing;

  const next = [...existing, trimmed];
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(next));
  return next;
}

/**
 * รวมหมวดมาตรฐาน + หมวดจากเมนูจริง + หมวดที่เพิ่มเอง
 * คงลำดับมาตรฐานไว้ด้านหน้า แล้วตามด้วยของใหม่
 */
export function mergeMenuCategories(
  fromItems: string[] = [],
  custom: string[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (name: string) => {
    const trimmed = normalizeCategoryName(name);
    if (!trimmed || HIDDEN_MENU_CATEGORIES.has(trimmed)) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  };

  for (const c of MENU_CATEGORIES) push(c);
  for (const c of custom) push(c);
  for (const c of fromItems) push(c);

  return result;
}

/** เรียงหมวดที่มีเมนูจริงตามลำดับมาตรฐาน — ใช้ใน POS / ลูกค้า / ฟิลเตอร์ */
export function orderedPresentCategories(fromItems: string[] = []): string[] {
  const present = new Set(
    fromItems
      .map(normalizeCategoryName)
      .filter(c => c && !HIDDEN_MENU_CATEGORIES.has(c))
      .map(c => c.toLowerCase()),
  );
  return mergeMenuCategories(fromItems).filter(c => present.has(c.toLowerCase()));
}
