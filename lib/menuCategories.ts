/** หมวดหมู่เมนูมาตรฐานของร้าน (ลำดับตามที่แสดงในตัวกรอง) */
export const MENU_CATEGORIES = [
  'เสียบไม้ย่าง',
  'กินเล่น',
  'ยำ',
  'ข้าว',
  'สลัด',
  'จานหลัก',
  'ซูชิ',
  'โรล',
  'มากิ',
  'เครื่องดื่ม',
  'อื่นๆ',
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const DEFAULT_MENU_CATEGORY: MenuCategory = 'เสียบไม้ย่าง';

const CUSTOM_CATEGORIES_KEY = 'yokayaki_custom_menu_categories';

/** อ่านหมวดที่เจ้าของร้านเพิ่มเอง (เก็บใน localStorage) */
export function readCustomMenuCategories(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(v => String(v).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** บันทึกหมวดที่เพิ่มเอง (ไม่ซ้ำกับมาตรฐาน) */
export function saveCustomMenuCategory(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return readCustomMenuCategories();

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
 * คงลำดับมาตรฐานไว้ด้านหน้า แล้วตามด้วยของใหม่อย่างมีระเบียบ
 */
export function mergeMenuCategories(
  fromItems: string[] = [],
  custom: string[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
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
