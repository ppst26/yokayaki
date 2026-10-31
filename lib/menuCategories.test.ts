import { describe, it, expect, vi } from 'vitest';
import {
  MENU_CATEGORIES,
  DEFAULT_MENU_CATEGORY,
  normalizeCategoryName,
  orderedPresentCategories,
  buildCategoryTree,
  buildCategoryTreeWithFallback,
  filterMenuItemsByCategory,
  ALL_MAIN_CATEGORY,
  ALL_SUB_CATEGORY,
  saveCategoryHierarchy,
  type MenuCategoryRow,
} from './menuCategories';
import { supabase } from '@/lib/supabase';

describe('menuCategories', () => {
  it('should have Today’s Special as first category and default', () => {
    expect(MENU_CATEGORIES[0]).toBe('Today’s Special');
    expect(DEFAULT_MENU_CATEGORY).toBe('Today’s Special');
  });

  it('should normalize Recommend, recommend, recoommend, and Today\'s Special to Today’s Special', () => {
    expect(normalizeCategoryName('Recommend')).toBe('Today’s Special');
    expect(normalizeCategoryName('recommend')).toBe('Today’s Special');
    expect(normalizeCategoryName('recoommend')).toBe('Today’s Special');
    expect(normalizeCategoryName('แนะนำ')).toBe('Today’s Special');
    expect(normalizeCategoryName("Today's Special")).toBe('Today’s Special');
    expect(normalizeCategoryName('Today’s Special')).toBe('Today’s Special');
  });

  it('should place Today’s Special first in orderedPresentCategories', () => {
    const present = orderedPresentCategories(['ซูชิ', 'Recommend', 'Appetizer']);
    expect(present[0]).toBe('Today’s Special');
    expect(present[1]).toBe('Appetizer');
    expect(present[2]).toBe('ซูชิ');
  });

  describe('buildCategoryTree', () => {
    it('buildCategoryTree correctly groups parent and child categories', () => {
      const rows: MenuCategoryRow[] = [
        { id: 1, org_id: 'org1', name: 'อาหาร', sort_order: 1, parent_id: null, created_at: '' },
        { id: 2, org_id: 'org1', name: 'ของทานเล่น', sort_order: 1, parent_id: 1, created_at: '' },
        { id: 3, org_id: 'org1', name: 'จานหลัก', sort_order: 2, parent_id: 1, created_at: '' },
        { id: 4, org_id: 'org1', name: 'เครื่องดื่ม', sort_order: 2, parent_id: null, created_at: '' },
      ];
      const tree = buildCategoryTree(rows);
      expect(tree).toHaveLength(2);
      expect(tree[0].name).toBe('อาหาร');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].name).toBe('ของทานเล่น');
      expect(tree[0].children[1].name).toBe('จานหลัก');
      expect(tree[1].name).toBe('เครื่องดื่ม');
      expect(tree[1].children).toHaveLength(0);
    });

    it('returns empty array when given empty categories', () => {
      expect(buildCategoryTree([])).toEqual([]);
    });

    it('orders parents and children by sort_order ascending', () => {
      const rows: MenuCategoryRow[] = [
        { id: 10, org_id: 'org1', name: 'Second Parent', sort_order: 20, parent_id: null, created_at: '' },
        { id: 20, org_id: 'org1', name: 'First Parent', sort_order: 10, parent_id: null, created_at: '' },
        { id: 30, org_id: 'org1', name: 'Child B', sort_order: 2, parent_id: 20, created_at: '' },
        { id: 40, org_id: 'org1', name: 'Child A', sort_order: 1, parent_id: 20, created_at: '' },
      ];
      const tree = buildCategoryTree(rows);
      expect(tree.map(t => t.name)).toEqual(['First Parent', 'Second Parent']);
      expect(tree[0].children.map(c => c.name)).toEqual(['Child A', 'Child B']);
    });
  });

  describe('saveCategoryHierarchy', () => {
    it('updates parent_id and sort_order for each item', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.spyOn(supabase, 'from').mockReturnValue({ update: updateMock } as any);

      const res = await saveCategoryHierarchy([
        { id: 2, parent_id: 1, sort_order: 1 },
        { id: 3, parent_id: null, sort_order: 2 },
      ]);

      expect(res.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('menu_categories');
      expect(updateMock).toHaveBeenCalledWith({ parent_id: 1, sort_order: 1 });
      expect(updateMock).toHaveBeenCalledWith({ parent_id: null, sort_order: 2 });
    });

    it('returns error when an update fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.spyOn(supabase, 'from').mockReturnValue({ update: updateMock } as any);

      const res = await saveCategoryHierarchy([
        { id: 2, parent_id: 1, sort_order: 1 },
      ]);

      expect(res.error).toBe('Database error');
    });
  });

  describe('addMenuCategory', () => {
    it('inserts category with parent_id if provided', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: 10, name: 'ของหวาน', sort_order: 5, parent_id: 2 },
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      const limitMock = vi.fn().mockReturnValue({ data: [{ sort_order: 4 }] });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const fromSelectMock = vi.fn().mockReturnValue({ order: orderMock });

      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'menu_categories') {
          return {
            select: fromSelectMock,
            insert: insertMock,
          } as any;
        }
        return {} as any;
      }) as any);

      const { addMenuCategory } = await import('./menuCategories');
      const res = await addMenuCategory('ของหวาน', 2);

      expect(res.error).toBeNull();
      expect(res.data?.parent_id).toBe(2);
      expect(insertMock).toHaveBeenCalledWith({
        name: 'ของหวาน',
        sort_order: 5,
        parent_id: 2,
      });
    });
  });

  describe('buildCategoryTreeWithFallback & filterMenuItemsByCategory', () => {
    const rows: MenuCategoryRow[] = [
      { id: 1, org_id: 'org1', name: 'อาหาร', sort_order: 1, parent_id: null, created_at: '' },
      { id: 2, org_id: 'org1', name: 'ของทานเล่น', sort_order: 1, parent_id: 1, created_at: '' },
      { id: 3, org_id: 'org1', name: 'จานหลัก', sort_order: 2, parent_id: 1, created_at: '' },
      { id: 4, org_id: 'org1', name: 'เครื่องดื่ม', sort_order: 2, parent_id: null, created_at: '' },
    ];

    it('buildCategoryTreeWithFallback appends orphan item categories as root categories', () => {
      const items = [
        { category: 'ของทานเล่น' },
        { category: 'ของหวาน' }, // Not in rows
      ];
      const tree = buildCategoryTreeWithFallback(rows, items);
      expect(tree).toHaveLength(3); // อาหาร, เครื่องดื่ม, ของหวาน
      expect(tree.some(t => t.name === 'ของหวาน')).toBe(true);
    });

    it('filterMenuItemsByCategory returns all items when ALL_MAIN_CATEGORY is selected', () => {
      const tree = buildCategoryTree(rows);
      const items = [
        { id: 1, category: 'ของทานเล่น' },
        { id: 2, category: 'จานหลัก' },
        { id: 3, category: 'เครื่องดื่ม' },
      ];

      const res = filterMenuItemsByCategory(items, ALL_MAIN_CATEGORY, ALL_SUB_CATEGORY, tree);
      expect(res).toHaveLength(3);
    });

    it('filterMenuItemsByCategory returns all subcategory items when main is selected and sub is ALL_SUB_CATEGORY', () => {
      const tree = buildCategoryTree(rows);
      const items = [
        { id: 1, category: 'ของทานเล่น' },
        { id: 2, category: 'จานหลัก' },
        { id: 3, category: 'เครื่องดื่ม' },
      ];

      const res = filterMenuItemsByCategory(items, 'อาหาร', ALL_SUB_CATEGORY, tree);
      expect(res).toHaveLength(2);
      expect(res.map(i => i.id)).toEqual([1, 2]);
    });

    it('filterMenuItemsByCategory returns only subcategory items when a specific subcategory is selected', () => {
      const tree = buildCategoryTree(rows);
      const items = [
        { id: 1, category: 'ของทานเล่น' },
        { id: 2, category: 'จานหลัก' },
        { id: 3, category: 'เครื่องดื่ม' },
      ];

      const res = filterMenuItemsByCategory(items, 'อาหาร', 'ของทานเล่น', tree);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(1);
    });
  });
});
