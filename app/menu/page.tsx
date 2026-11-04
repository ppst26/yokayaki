import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DigitalMenuView, type DigitalMenuItem } from '@/components/menu/DigitalMenuView';
import type { MenuCategoryRow } from '@/lib/menuCategories';

export const metadata: Metadata = {
  title: 'เมนูอาหาร | Yo-Yaki Izakaya',
  description: 'รายการอาหารและเครื่องดื่ม Yo-Yaki Izakaya — Japanese BBQ & Sushi Bar',
  openGraph: {
    title: 'เมนูอาหาร | Yo-Yaki Izakaya',
    description: 'รายการอาหารและเครื่องดื่ม Yo-Yaki Izakaya',
    images: ['/branding/app-bg.webp'],
  },
};

// ISR: revalidate ทุก 60 วินาที — เมนูเปลี่ยนบ่อย
export const revalidate = 60;

async function getMenuData(): Promise<{
  items: DigitalMenuItem[];
  categories: MenuCategoryRow[];
}> {
  const [itemsRes, catsRes] = await Promise.all([
    supabaseAdmin
      .from('menu_items')
      .select(
        'id, name, name_en, price, is_happy_hour, happy_hour_price, image_url, category, is_available, stock, is_stock_tracked',
      )
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('menu_categories')
      .select('id, org_id, name, sort_order, parent_id, created_at')
      .order('sort_order', { ascending: true }),
  ]);

  if (itemsRes.error) {
    console.error('[/menu] Error fetching menu_items:', itemsRes.error);
  }
  if (catsRes.error) {
    console.error('[/menu] Error fetching menu_categories:', catsRes.error);
  }

  return {
    items: (itemsRes.data ?? []) as DigitalMenuItem[],
    categories: (catsRes.data ?? []) as MenuCategoryRow[],
  };
}

export default async function MenuPage() {
  const { items, categories } = await getMenuData();

  return (
    <DigitalMenuView
      initialItems={items}
      initialCategories={categories}
    />
  );
}

