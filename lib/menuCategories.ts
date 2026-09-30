import { supabase } from '@/lib/supabase';

// =====================================================================
// menu_categories — CRUD จากตาราง menu_categories ใน Supabase
// ยังคง normalize + HIDDEN_MENU_CATEGORIES เอาไว้ เพื่อ backward compat
// =====================================================================

export interface MenuCategoryRow {
  id: number;
  org_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

/** หมวดที่ซ่อน/ลบออกจาก UI */
export const HIDDEN_MENU_CATEGORIES = new Set(['ทดสอบ']);

/** ค่า default สำหรับเมนูใหม่ (ใช้ถ้า DB ยังไม่มี row) */
export const DEFAULT_MENU_CATEGORY = 'Today\u2019s Special';

/** Fallback hardcode — ใช้แค่ตอน DB fetch ยังไม่ได้ */
export const MENU_CATEGORIES = [
  'Today\u2019s Special',
  'Appetizer',
  'ของย่าง',
  'ยำไทย',
  'อิ่มท้อง',
  'สลัด',
  'จานหลัก',
  'ซาชิมิ',
  'ซูชิ',
  'โรล',
  'มากิ',
  'เครื่องดื่ม',
  'อื่นๆ',
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

/** แปลงชื่อหมวดเก่า → ใหม่ (ให้ลำดับ chip ตรงกับมาตรฐาน) */
export function normalizeCategoryName(name: string): string {
  const trimmed = name.trim();
  switch (trimmed) {
    case 'Recommend':
    case 'recommend':
    case 'recoommend':
    case 'Recommed':
    case 'แนะนำ':
    case "Today's Special":
    case 'Today\u2019s Special':
    case "today's special":
    case 'today\u2019s special':
      return 'Today\u2019s Special';
    case 'กินเล่น':
    case 'ทานเล่น':
      return 'Appetizer';
    case 'ย่าง':
    case 'เสียบไม้ย่าง':
    case 'เสียบไม้/ย่าง':
      return 'ของย่าง';
    case 'ยำ':
      return 'ยำไทย';
    case 'ต้ม/แกง':
    case 'เส้น':
    case 'หม้อไฟ':
    case 'ข้าว':
      return 'อิ่มท้อง';
    case 'ซาซิมิ':
      return 'ซาชิมิ';
    default:
      return trimmed;
  }
}

// =====================================================================
// DB CRUD
// =====================================================================

/** ดึงหมวดหมู่ทั้งหมดจาก DB เรียงตาม sort_order */
export async function fetchMenuCategories(): Promise<MenuCategoryRow[]> {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching menu_categories:', error);
    return [];
  }
  return (data ?? []) as MenuCategoryRow[];
}

/** เพิ่มหมวดหมู่ใหม่ — sort_order = สูงสุด + 1 */
export async function addMenuCategory(
  name: string,
): Promise<{ data: MenuCategoryRow | null; error: string | null }> {
  const trimmed = normalizeCategoryName(name);
  if (!trimmed || HIDDEN_MENU_CATEGORIES.has(trimmed)) {
    return { data: null, error: 'ชื่อหมวดหมู่ไม่ถูกต้อง' };
  }

  // หา sort_order สูงสุด
  const { data: existing } = await supabase
    .from('menu_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ name: trimmed, sort_order: nextOrder })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'หมวดหมู่นี้มีอยู่แล้ว' };
    }
    return { data: null, error: error.message };
  }
  return { data: data as MenuCategoryRow, error: null };
}

/** แก้ไขชื่อหมวดหมู่ */
export async function renameMenuCategory(
  id: number,
  newName: string,
): Promise<{ error: string | null }> {
  const trimmed = normalizeCategoryName(newName);
  if (!trimmed || HIDDEN_MENU_CATEGORIES.has(trimmed)) {
    return { error: 'ชื่อหมวดหมู่ไม่ถูกต้อง' };
  }

  const { error } = await supabase
    .from('menu_categories')
    .update({ name: trimmed })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') {
      return { error: 'ชื่อหมวดหมู่ซ้ำ' };
    }
    return { error: error.message };
  }
  return { error: null };
}

/** ลบหมวดหมู่ (ไม่ได้ลบเมนูที่อยู่ในหมวดนี้ — เมนูจะยังอยู่แต่ category เป็น orphan) */
export async function deleteMenuCategory(
  id: number,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  return { error: null };
}

/** อัปเดตลำดับ sort_order ของหลาย category พร้อมกัน */
export async function reorderMenuCategories(
  items: { id: number; sort_order: number }[],
): Promise<{ error: string | null }> {
  // batch update — ใช้ Promise.all (ไม่มี upsert batch ใน Supabase client)
  const results = await Promise.all(
    items.map(({ id, sort_order }) =>
      supabase.from('menu_categories').update({ sort_order }).eq('id', id),
    ),
  );

  const firstError = results.find(r => r.error);
  if (firstError?.error) return { error: firstError.error.message };
  return { error: null };
}

/** อัปเดตชื่อ category ใน menu_items ทั้ง org ที่ใช้ชื่อเก่า → ชื่อใหม่ */
export async function bulkRenameCategoryInMenuItems(
  oldName: string,
  newName: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('menu_items')
    .update({ category: newName })
    .eq('category', oldName);

  if (error) return { error: error.message };
  return { error: null };
}

// =====================================================================
// Legacy helpers — ยังต้องใช้ใน component ที่ยังไม่ได้ migrate
// =====================================================================

const CUSTOM_CATEGORIES_KEY = 'yokayaki_custom_menu_categories';

/** อ่านหมวดที่เจ้าของร้านเพิ่มเอง (เก็บใน localStorage) — legacy */
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

/** บันทึกหมวดที่เพิ่มเอง (ไม่ซ้ำกับมาตรฐาน) — legacy */
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

/**
 * รวมหมวดจาก DB rows + หมวดจากเมนูจริง (fallback กรณีเมนูอ้างหมวดที่ยังไม่อยู่ใน DB)
 * ใช้แทน mergeMenuCategories เดิม — ลำดับมาจาก sort_order ใน DB
 */
export function mergeMenuCategoriesFromDB(
  dbCategories: MenuCategoryRow[],
  fromItems: string[] = [],
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

  // DB categories มาก่อน (เรียง sort_order แล้ว)
  for (const row of dbCategories) push(row.name);
  // fallback: หมวดจากเมนูจริงที่อาจยังไม่มีใน DB
  for (const c of fromItems) push(c);

  return result;
}

/** เรียงหมวดที่มีเมนูจริงตาม DB order — ใช้ใน POS / ลูกค้า / ฟิลเตอร์ */
export function orderedPresentCategories(fromItems: string[] = []): string[] {
  const present = new Set(
    fromItems
      .map(normalizeCategoryName)
      .filter(c => c && !HIDDEN_MENU_CATEGORIES.has(c))
      .map(c => c.toLowerCase()),
  );
  return mergeMenuCategories(fromItems).filter(c => present.has(c.toLowerCase()));
}

/**
 * เรียงหมวดที่มีเมนูจริงตาม DB order (เวอร์ชัน DB)
 */
export function orderedPresentCategoriesFromDB(
  dbCategories: MenuCategoryRow[],
  fromItems: string[] = [],
): string[] {
  const present = new Set(
    fromItems
      .map(normalizeCategoryName)
      .filter(c => c && !HIDDEN_MENU_CATEGORIES.has(c))
      .map(c => c.toLowerCase()),
  );
  return mergeMenuCategoriesFromDB(dbCategories, fromItems).filter(c =>
    present.has(c.toLowerCase()),
  );
}
