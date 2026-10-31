import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchPromotionTargets,
  savePromotionTargets,
  isPromoActive,
  doesPromoMatchItem,
  getItemPromoBadge,
  type ActivePromotion,
} from './promoTargets';
import { supabase } from '@/lib/supabase';

describe('promoTargets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPromotionTargets', () => {
    it('returns target rows for the given promoId', async () => {
      const mockData = [
        { id: 1, promotion_id: 10, target_type: 'main_category', target_id: 2 },
        { id: 2, promotion_id: 10, target_type: 'menu_item', target_id: 55 },
      ];
      const eqMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.spyOn(supabase, 'from').mockReturnValue({ select: selectMock } as any);

      const targets = await fetchPromotionTargets(10);
      expect(supabase.from).toHaveBeenCalledWith('promotion_targets');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('promotion_id', 10);
      expect(targets).toEqual(mockData);
    });

    it('returns empty array when error occurs', async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed' } });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.spyOn(supabase, 'from').mockReturnValue({ select: selectMock } as any);

      const targets = await fetchPromotionTargets(10);
      expect(targets).toEqual([]);
    });
  });

  describe('savePromotionTargets', () => {
    it('deletes existing targets and inserts new targets', async () => {
      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'promotion_targets') {
          return {
            delete: deleteMock,
            insert: insertMock,
          };
        }
        return {};
      }) as any);

      const targets = [
        { target_type: 'main_category', target_id: 1 },
        { target_type: 'sub_category', target_id: 2 },
      ];

      const res = await savePromotionTargets(10, targets);

      expect(res.error).toBeNull();
      expect(deleteMock).toHaveBeenCalled();
      expect(deleteEqMock).toHaveBeenCalledWith('promotion_id', 10);
      expect(insertMock).toHaveBeenCalledWith([
        { promotion_id: 10, target_type: 'main_category', target_id: 1 },
        { promotion_id: 10, target_type: 'sub_category', target_id: 2 },
      ]);
    });

    it('deletes existing targets without inserting when targets array is empty', async () => {
      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabase, 'from').mockReturnValue({
        delete: deleteMock,
        insert: insertMock,
      } as any);

      const res = await savePromotionTargets(10, []);

      expect(res.error).toBeNull();
      expect(deleteMock).toHaveBeenCalled();
      expect(deleteEqMock).toHaveBeenCalledWith('promotion_id', 10);
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('returns error if delete fails', async () => {
      const deleteEqMock = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
      const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
      const insertMock = vi.fn();

      vi.spyOn(supabase, 'from').mockReturnValue({
        delete: deleteMock,
        insert: insertMock,
      } as any);

      const res = await savePromotionTargets(10, [{ target_type: 'menu_item', target_id: 1 }]);
      expect(res.error).toBe('Delete failed');
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('returns error if insert fails', async () => {
      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
      const insertMock = vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } });

      vi.spyOn(supabase, 'from').mockReturnValue({
        delete: deleteMock,
        insert: insertMock,
      } as any);

      const res = await savePromotionTargets(10, [{ target_type: 'menu_item', target_id: 1 }]);
      expect(res.error).toBe('Insert failed');
    });
  });

  describe('isPromoActive', () => {
    it('returns false when is_active is false', () => {
      const promo: ActivePromotion = { id: 1, name: 'P1', type: 'percentage', is_active: false };
      expect(isPromoActive(promo)).toBe(false);
    });

    it('returns false when before start_date', () => {
      const promo: ActivePromotion = {
        id: 1,
        name: 'P1',
        type: 'percentage',
        is_active: true,
        start_date: '2026-12-01',
      };
      const now = new Date('2026-10-31T12:00:00');
      expect(isPromoActive(promo, now)).toBe(false);
    });

    it('returns false when after end_date', () => {
      const promo: ActivePromotion = {
        id: 1,
        name: 'P1',
        type: 'percentage',
        is_active: true,
        end_date: '2026-10-01',
      };
      const now = new Date('2026-10-31T12:00:00');
      expect(isPromoActive(promo, now)).toBe(false);
    });

    it('checks start_time and end_time', () => {
      const promo: ActivePromotion = {
        id: 1,
        name: 'P1',
        type: 'percentage',
        is_active: true,
        start_time: '14:00',
        end_time: '17:00',
      };
      const during = new Date('2026-10-31T15:30:00');
      const before = new Date('2026-10-31T13:30:00');
      const after = new Date('2026-10-31T18:00:00');

      expect(isPromoActive(promo, during)).toBe(true);
      expect(isPromoActive(promo, before)).toBe(false);
      expect(isPromoActive(promo, after)).toBe(false);
    });
  });

  describe('doesPromoMatchItem & getItemPromoBadge', () => {
    const categories = [
      { id: 1, name: 'อาหาร', parent_id: null },
      { id: 2, name: 'ของทานเล่น', parent_id: 1 },
      { id: 3, name: 'เครื่องดื่ม', parent_id: null },
    ];

    it('matches store-wide promotion when no targets are set', () => {
      const promo: ActivePromotion = {
        id: 1,
        name: 'All 10%',
        type: 'percentage',
        discount_percent: 10,
        is_active: true,
      };
      const item = { id: 10, category: 'ของทานเล่น' };
      expect(doesPromoMatchItem(promo, item, [], categories)).toBe(true);
      expect(getItemPromoBadge(item, [promo], [], categories)).toBe('ลด 10%');
    });

    it('matches specific menu_item target', () => {
      const promo: ActivePromotion = {
        id: 1,
        name: 'Item 20%',
        type: 'percentage',
        discount_percent: 20,
        is_active: true,
      };
      const targets = [{ promotion_id: 1, target_type: 'menu_item', target_id: 10 }];
      const itemMatch = { id: 10, category: 'ของทานเล่น' };
      const itemOther = { id: 11, category: 'ของทานเล่น' };

      expect(doesPromoMatchItem(promo, itemMatch, targets, categories)).toBe(true);
      expect(doesPromoMatchItem(promo, itemOther, targets, categories)).toBe(false);
      expect(getItemPromoBadge(itemMatch, [promo], targets, categories)).toBe('ลด 20%');
      expect(getItemPromoBadge(itemOther, [promo], targets, categories)).toBeNull();
    });

    it('matches sub_category target', () => {
      const promo: ActivePromotion = {
        id: 1,
        name: 'Snack 15%',
        type: 'percentage',
        discount_percent: 15,
        is_active: true,
      };
      const targets = [{ promotion_id: 1, target_type: 'sub_category', target_id: 2 }];
      const itemSnack = { id: 10, category: 'ของทานเล่น' };
      const itemDrink = { id: 11, category: 'เครื่องดื่ม' };

      expect(doesPromoMatchItem(promo, itemSnack, targets, categories)).toBe(true);
      expect(doesPromoMatchItem(promo, itemDrink, targets, categories)).toBe(false);
    });

    it('matches main_category target across all child subcategories', () => {
      const promo: ActivePromotion = {
        id: 1,
        name: 'Food 10%',
        type: 'percentage',
        discount_percent: 10,
        is_active: true,
      };
      const targets = [{ promotion_id: 1, target_type: 'main_category', target_id: 1 }];
      const itemSnack = { id: 10, category: 'ของทานเล่น' }; // child of อาหาร
      const itemDrink = { id: 11, category: 'เครื่องดื่ม' };

      expect(doesPromoMatchItem(promo, itemSnack, targets, categories)).toBe(true);
      expect(doesPromoMatchItem(promo, itemDrink, targets, categories)).toBe(false);
      expect(getItemPromoBadge(itemSnack, [promo], targets, categories)).toBe('ลด 10%');
    });

    it('formats badge for fixed and buy_x_get_y promos', () => {
      const fixedPromo: ActivePromotion = {
        id: 2,
        name: 'Minus 50',
        type: 'fixed',
        discount_amount: 50,
        is_active: true,
      };
      const bxyPromo: ActivePromotion = {
        id: 3,
        name: 'Buy 2 get 1',
        type: 'buy_x_get_y',
        buy_qty: 2,
        free_qty: 1,
        is_active: true,
      };
      const item = { id: 10, category: 'ของทานเล่น' };

      expect(getItemPromoBadge(item, [fixedPromo], [], categories)).toBe('ลด ฿50');
      expect(getItemPromoBadge(item, [bxyPromo], [], categories)).toBe('ซื้อ 2 แถม 1');
    });
  });
});
