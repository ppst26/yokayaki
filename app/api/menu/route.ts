import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/menu
 * Public endpoint — ส่งข้อมูลเมนูที่เปิดให้บริการ + หมวดหมู่
 * ใช้ service-role key บน server tier เท่านั้น (ไม่มี anon key ออกไป client)
 * Cache 60 วินาที เพื่อลด DB round-trip
 */
export async function GET() {
  try {
    const [itemsRes, catsRes] = await Promise.all([
      supabaseAdmin
        .from('menu_items')
        .select('id, name, name_en, price, is_happy_hour, happy_hour_price, image_url, category, is_available, stock, is_stock_tracked')
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
      supabaseAdmin
        .from('menu_categories')
        .select('id, org_id, name, sort_order, parent_id, created_at')
        .order('sort_order', { ascending: true }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (catsRes.error) throw catsRes.error;

    return NextResponse.json(
      { items: itemsRes.data ?? [], categories: catsRes.data ?? [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (err: unknown) {
    console.error('[GET /api/menu]', err);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลเมนูได้' }, { status: 500 });
  }
}

