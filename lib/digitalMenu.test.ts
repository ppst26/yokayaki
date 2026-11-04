import { describe, it, expect } from 'vitest';
import { menuItemSalePrice } from '@/lib/menuPrice';
import {
  buildCategoryTreeWithFallback,
  filterMenuItemsByCategory,
  ALL_MAIN_CATEGORY,
  ALL_SUB_CATEGORY,
} from '@/lib/menuCategories';
import type { DigitalMenuItem } from '@/components/menu/DigitalMenuView';

describe('Digital Menu System', () => {
  const mockCategories = [
    { id: 1, org_id: 'org-1', name: 'ซาชิมิ', sort_order: 1, parent_id: null, created_at: '' },
    { id: 2, org_id: 'org-1', name: 'แซลมอน', sort_order: 2, parent_id: 1, created_at: '' },
    { id: 3, org_id: 'org-1', name: 'ของย่าง', sort_order: 3, parent_id: null, created_at: '' },
  ];

  const mockItems: DigitalMenuItem[] = [
    {
      id: 101,
      name: 'แซลมอน ซาชิมิ',
      name_en: 'Salmon Sashimi',
      price: 250,
      is_happy_hour: true,
      happy_hour_price: 199,
      category: 'แซลมอน',
      stock: 10,
      is_stock_tracked: true,
      is_available: true,
    },
    {
      id: 102,
      name: 'ทูน่า ซาชิมิ',
      name_en: 'Tuna Sashimi',
      price: 320,
      is_happy_hour: false,
      happy_hour_price: null,
      category: 'ซาชิมิ',
      stock: 5,
      is_stock_tracked: true,
      is_available: true,
    },
    {
      id: 103,
      name: 'ไก่ย่างเทอริยากิ',
      name_en: 'Yakitori Teriyaki',
      price: 89,
      is_happy_hour: false,
      happy_hour_price: null,
      category: 'ของย่าง',
      stock: 0,
      is_stock_tracked: true,
      is_available: true,
    },
    {
      id: 104,
      name: 'ชาเขียวเย็น',
      name_en: 'Iced Green Tea',
      price: 40,
      is_happy_hour: false,
      happy_hour_price: null,
      category: 'เครื่องดื่มพิเศษ', // Unregistered category
      stock: 99,
      is_stock_tracked: false,
      is_available: true,
    },
  ];

  it('builds category tree with automatic fallback for unregistered categories', () => {
    const tree = buildCategoryTreeWithFallback(mockCategories, mockItems);
    const mainNames = tree.map(c => c.name);

    expect(mainNames).toContain('ซาชิมิ');
    expect(mainNames).toContain('ของย่าง');
    expect(mainNames).toContain('เครื่องดื่มพิเศษ');

    const sashimi = tree.find(c => c.name === 'ซาชิมิ');
    expect(sashimi?.children.map(c => c.name)).toContain('แซลมอน');
  });

  it('filters menu items by main category correctly including its subcategories', () => {
    const tree = buildCategoryTreeWithFallback(mockCategories, mockItems);

    const sashimiItems = filterMenuItemsByCategory(
      mockItems,
      'ซาชิมิ',
      ALL_SUB_CATEGORY,
      tree,
    );
    expect(sashimiItems.map(i => i.id)).toEqual([101, 102]);
  });

  it('filters menu items by specific subcategory', () => {
    const tree = buildCategoryTreeWithFallback(mockCategories, mockItems);

    const salmonItems = filterMenuItemsByCategory(
      mockItems,
      'ซาชิมิ',
      'แซลมอน',
      tree,
    );
    expect(salmonItems.map(i => i.id)).toEqual([101]);
  });

  it('returns all items when ALL_MAIN_CATEGORY is selected', () => {
    const tree = buildCategoryTreeWithFallback(mockCategories, mockItems);

    const allItems = filterMenuItemsByCategory(
      mockItems,
      ALL_MAIN_CATEGORY,
      ALL_SUB_CATEGORY,
      tree,
    );
    expect(allItems.length).toBe(mockItems.length);
  });

  it('calculates regular vs happy hour price accurately based on mock time', () => {
    const hhItem = mockItems[0];
    const nonHhItem = mockItems[1];

    // During HH: 18:00 Bangkok time
    const duringHH = new Date('2026-11-04T11:00:00Z'); // 11:00 UTC = 18:00 BKK
    expect(menuItemSalePrice(hhItem, duringHH)).toBe(199);
    expect(menuItemSalePrice(nonHhItem, duringHH)).toBe(320);

    // Outside HH: 14:00 Bangkok time
    const outsideHH = new Date('2026-11-04T07:00:00Z'); // 07:00 UTC = 14:00 BKK
    expect(menuItemSalePrice(hhItem, outsideHH)).toBe(250);
    expect(menuItemSalePrice(nonHhItem, outsideHH)).toBe(320);
  });
});

