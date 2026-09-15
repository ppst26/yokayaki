import { describe, it, expect } from 'vitest';
import {
  MENU_CATEGORIES,
  DEFAULT_MENU_CATEGORY,
  normalizeCategoryName,
  orderedPresentCategories,
} from './menuCategories';

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
});
