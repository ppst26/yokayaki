import { supabase } from '@/lib/supabase';
import { normalizeCategoryName } from '@/lib/menuCategories';

export type PromoTargetType = 'main_category' | 'sub_category' | 'menu_item';

export interface PromotionTargetRow {
  id: number;
  promotion_id: number;
  target_type: PromoTargetType | string;
  target_id: number;
  org_id?: string;
  created_at?: string;
}

export interface PromoTargetInput {
  target_type: string;
  target_id: number;
}

/** ดึงรายการ target ทั้งหมดของโปรโมชั่นนี้ */
export async function fetchPromotionTargets(promoId: number): Promise<PromotionTargetRow[]> {
  const { data, error } = await supabase
    .from('promotion_targets')
    .select('*')
    .eq('promotion_id', promoId);

  if (error) {
    console.error('Error fetching promotion_targets:', error);
    return [];
  }
  return (data ?? []) as PromotionTargetRow[];
}

/**
 * บันทึก targets ของโปรโมชั่น (ลบของเดิมทั้งหมด แล้วเพิ่มใหม่ถ้ามี)
 * หาก targets เป็น array ว่าง จะลบ target ออกทั้งหมด (หมายถึงโปรโมชั่นครอบคลุมทั้งร้าน)
 */
export async function savePromotionTargets(
  promoId: number,
  targets: Array<{ target_type: string; target_id: number }>,
): Promise<{ error: string | null }> {
  // ลบ targets เดิมทั้งหมดของ promotion นี้
  const { error: deleteError } = await supabase
    .from('promotion_targets')
    .delete()
    .eq('promotion_id', promoId);

  if (deleteError) {
    console.error('Error deleting promotion_targets:', deleteError);
    return { error: deleteError.message };
  }

  // ถ้าไม่มี targets ให้บันทึก จบงาน
  if (targets.length === 0) {
    return { error: null };
  }

  const rowsToInsert = targets.map(t => ({
    promotion_id: promoId,
    target_type: t.target_type,
    target_id: t.target_id,
  }));

  const { error: insertError } = await supabase
    .from('promotion_targets')
    .insert(rowsToInsert);

  if (insertError) {
    console.error('Error inserting promotion_targets:', insertError);
    return { error: insertError.message };
  }

  return { error: null };
}

export interface ActivePromotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y' | string;
  discount_percent?: number | null;
  discount_amount?: number | null;
  buy_qty?: number | null;
  free_qty?: number | null;
  min_order_amount?: number | null;
  coupon_code?: string | null;
  is_active?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  menu_item_id?: number | null;
}

/**
 * ตรวจสอบว่าโปรโมชั่นกำลังมีผลใช้งาน ณ วัน/เวลาปัจจุบันหรือไม่
 */
export function isPromoActive(promo: ActivePromotion, now: Date = new Date()): boolean {
  if (promo.is_active === false) return false;

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (promo.start_date && promo.start_date > todayStr) return false;
  if (promo.end_date && promo.end_date < todayStr) return false;

  if (promo.start_time && promo.end_time) {
    const curH = String(now.getHours()).padStart(2, '0');
    const curM = String(now.getMinutes()).padStart(2, '0');
    const curTime = `${curH}:${curM}`;
    const startTime = promo.start_time.slice(0, 5);
    const endTime = promo.end_time.slice(0, 5);
    if (curTime < startTime || curTime >= endTime) {
      return false;
    }
  }

  return true;
}

/**
 * ตรวจสอบว่าโปรโมชั่นครอบคลุมเมนูนี้หรือไม่ (ตาม target หรือ store-wide)
 */
export function doesPromoMatchItem(
  promo: ActivePromotion,
  item: { id: number; category: string },
  targets: Array<{ promotion_id: number; target_type: string; target_id: number }>,
  categories: Array<{ id: number; name: string; parent_id?: number | null }>,
): boolean {
  const promoTargets = targets.filter(t => t.promotion_id === promo.id);

  if (promoTargets.length === 0) {
    if (promo.menu_item_id != null) {
      return promo.menu_item_id === item.id;
    }
    return true;
  }

  const itemCatNorm = normalizeCategoryName(item.category || '').toLowerCase();

  for (const target of promoTargets) {
    if (target.target_type === 'menu_item' && target.target_id === item.id) {
      return true;
    }

    if (target.target_type === 'sub_category') {
      const cat = categories.find(c => c.id === target.target_id);
      if (cat && normalizeCategoryName(cat.name).toLowerCase() === itemCatNorm) {
        return true;
      }
    }

    if (target.target_type === 'main_category') {
      const mainCat = categories.find(c => c.id === target.target_id);
      if (mainCat) {
        if (normalizeCategoryName(mainCat.name).toLowerCase() === itemCatNorm) {
          return true;
        }
        const childCats = categories.filter(c => c.parent_id === mainCat.id);
        if (childCats.some(c => normalizeCategoryName(c.name).toLowerCase() === itemCatNorm)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * คำนวณ badge ข้อความโปรโมชั่นสำหรับเมนูอาหาร (เช่น "ลด 10%", "ลด ฿50", "ซื้อ 2 แถม 1")
 */
export function getItemPromoBadge(
  item: { id: number; category: string },
  promotions: ActivePromotion[],
  targets: Array<{ promotion_id: number; target_type: string; target_id: number }>,
  categories: Array<{ id: number; name: string; parent_id?: number | null }>,
  now: Date = new Date(),
): string | null {
  const activeMatching = promotions.filter(
    p => isPromoActive(p, now) && doesPromoMatchItem(p, item, targets, categories),
  );

  if (activeMatching.length === 0) return null;

  const percentPromos = activeMatching.filter(
    p => p.type === 'percentage' && p.discount_percent && p.discount_percent > 0,
  );
  if (percentPromos.length > 0) {
    const maxPercent = Math.max(...percentPromos.map(p => p.discount_percent!));
    return `ลด ${maxPercent}%`;
  }

  const fixedPromos = activeMatching.filter(
    p => p.type === 'fixed' && p.discount_amount && p.discount_amount > 0,
  );
  if (fixedPromos.length > 0) {
    const maxFixed = Math.max(...fixedPromos.map(p => p.discount_amount!));
    return `ลด ฿${maxFixed.toLocaleString()}`;
  }

  const bxyPromo = activeMatching.find(
    p => p.type === 'buy_x_get_y' && p.buy_qty && p.free_qty,
  );
  if (bxyPromo) {
    return `ซื้อ ${bxyPromo.buy_qty} แถม ${bxyPromo.free_qty}`;
  }

  return 'โปรพิเศษ';
}
