import { supabase } from '@/lib/supabase';

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
