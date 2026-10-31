import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPromotionTargets, savePromotionTargets } from './promoTargets';
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
});
