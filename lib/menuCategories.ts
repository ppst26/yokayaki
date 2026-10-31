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
  parent_id?: number | null;
  created_at: string;
}

export interface CategoryTreeItem {
  id: number;
  name: string;
  sort_order: number;
  parent_id: number | null;
  children: CategoryTreeItem[];
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
// Category Tree Helpers
// =====================================================================

/** แปลงรายการหมวดหมู่เป็นต้นไม้ 2 ระดับ (Main Categories พร้อม Sub Categories) */
export function buildCategoryTree(categories: MenuCategoryRow[]): CategoryTreeItem[] {
  if (!categories || categories.length === 0) return [];

  const roots: CategoryTreeItem[] = [];
  const rootMap = new Map<number, CategoryTreeItem>();

  // สร้าง root items (parent_id == null หรือ undefined)
  for (const cat of categories) {
    if (cat.parent_id == null) {
      const item: CategoryTreeItem = {
        id: cat.id,
        name: cat.name,
        sort_order: cat.sort_order,
        parent_id: null,
        children: [],
      };
      roots.push(item);
      rootMap.set(cat.id, item);
    }
  }

  // จัด child items เข้า children ของ parent
  const orphans: CategoryTreeItem[] = [];
  for (const cat of categories) {
    if (cat.parent_id != null) {
      const childItem: CategoryTreeItem = {
        id: cat.id,
        name: cat.name,
        sort_order: cat.sort_order,
        parent_id: cat.parent_id,
        children: [],
      };

      const parent = rootMap.get(cat.parent_id);
      if (parent) {
        parent.children.push(childItem);
      } else {
        // หากไม่พบ parent ให้คงไว้เป็น root ชั่วคราวเพื่อกันข้อมูลสูญหาย
        orphans.push(childItem);
      }
    }
  }

  const allRoots = [...roots, ...orphans];
  allRoots.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  for (const root of allRoots) {
    root.children.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  return allRoots;
}

export const ALL_MAIN_CATEGORY = 'ทั้งหมด';
export const ALL_SUB_CATEGORY = 'ทั้งหมดในหมวด';

/**
 * รวมหมวดจาก DB rows เป็น CategoryTree และเติมหมวดจาก menu_items ที่ยังไม่มีใน DB ลงเป็น root
 */
export function buildCategoryTreeWithFallback(
  dbCategories: MenuCategoryRow[] = [],
  menuItems: Array<{ category: string }> = [],
): CategoryTreeItem[] {
  // สร้าง tree ตั้งต้นจาก DB
  const tree = buildCategoryTree(dbCategories);

  // รวบรวมชื่อหมวดทั้งหมดที่มีใน tree
  const existingNames = new Set<string>();
  for (const root of tree) {
    existingNames.add(normalizeCategoryName(root.name).toLowerCase());
    for (const child of root.children) {
      existingNames.add(normalizeCategoryName(child.name).toLowerCase());
    }
  }

  // หาหมวดที่มีอยู่ใน menuItems แต่ยังไม่อยู่ใน tree
  let nextId = -1;
  const missingRoots: CategoryTreeItem[] = [];

  for (const item of menuItems) {
    const rawCat = item.category || 'ทั่วไป';
    const norm = normalizeCategoryName(rawCat);
    if (!norm || HIDDEN_MENU_CATEGORIES.has(norm)) continue;
    const key = norm.toLowerCase();
    if (!existingNames.has(key)) {
      existingNames.add(key);
      missingRoots.push({
        id: nextId--,
        name: norm,
        sort_order: 999,
        parent_id: null,
        children: [],
      });
    }
  }

  return [...tree, ...missingRoots];
}

/**
 * กรองรายการอาหารตามหมวดหลัก (Main Category) และหมวดย่อย (Sub Category)
 */
export function filterMenuItemsByCategory<T extends { category: string }>(
  items: T[],
  selectedMain: string,
  selectedSub: string,
  categoryTree: CategoryTreeItem[],
): T[] {
  // 1. ถ้าเลือก 'ทั้งหมด' หรือไม่ได้เลือก ให้แสดงรายการทั้งหมด
  if (!selectedMain || selectedMain === ALL_MAIN_CATEGORY) {
    return items;
  }

  const selectedMainNorm = normalizeCategoryName(selectedMain).toLowerCase();
  const mainCat = categoryTree.find(
    c => normalizeCategoryName(c.name).toLowerCase() === selectedMainNorm,
  );

  // ถ้าไม่พบหมวดหลักใน tree ให้เทียบตรงๆ
  if (!mainCat) {
    return items.filter(
      item => normalizeCategoryName(item.category || '').toLowerCase() === selectedMainNorm,
    );
  }

  // 2. ถ้าเลือกหมวดหลัก และหมวดย่อยเป็น 'ทั้งหมดในหมวด' (หรือไม่ได้ระบุ)
  if (!selectedSub || selectedSub === ALL_SUB_CATEGORY) {
    const validCategoryNames = new Set<string>();
    validCategoryNames.add(selectedMainNorm);
    for (const child of mainCat.children) {
      validCategoryNames.add(normalizeCategoryName(child.name).toLowerCase());
    }

    return items.filter(item => {
      const itemCat = normalizeCategoryName(item.category || '').toLowerCase();
      return validCategoryNames.has(itemCat);
    });
  }

  // 3. ถ้าเลือกหมวดย่อยเฉพาะเจาะจง
  const selectedSubNorm = normalizeCategoryName(selectedSub).toLowerCase();
  return items.filter(
    item => normalizeCategoryName(item.category || '').toLowerCase() === selectedSubNorm,
  );
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
  parentId?: number | null,
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
    .insert({
      name: trimmed,
      sort_order: nextOrder,
      parent_id: parentId ?? null,
    })
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

/** บันทึกลำดับ sort_order และ parent_id ของหลาย category พร้อมกัน */
export async function saveCategoryHierarchy(
  updates: Array<{ id: number; parent_id: number | null; sort_order: number }>,
): Promise<{ error: string | null }> {
  const results = await Promise.all(
    updates.map(({ id, parent_id, sort_order }) =>
      supabase
        .from('menu_categories')
        .update({ parent_id, sort_order })
        .eq('id', id),
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
