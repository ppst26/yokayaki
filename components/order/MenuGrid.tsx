"use client";

import React, { useMemo } from 'react';
import { UtensilsCrossed, Plus, Tag } from 'lucide-react';
import { isHappyHourNow, menuItemSalePrice, type MenuPriceFields } from '@/lib/menuPrice';
import {
  ALL_MAIN_CATEGORY,
  ALL_SUB_CATEGORY,
  normalizeCategoryName,
  type CategoryTreeItem,
} from '@/lib/menuCategories';

export { ALL_MAIN_CATEGORY, ALL_SUB_CATEGORY };

export interface MenuItem extends MenuPriceFields {
  id: number;
  name: string;
  name_en?: string | null;
  stock: number;
  category: string;
  image_url?: string | null;
}

export interface MenuGridProps {
  // 2-tier category navigation
  categoryTree?: CategoryTreeItem[];
  selectedMainCategory?: string;
  setSelectedMainCategory?: (cat: string) => void;
  selectedSubCategory?: string;
  setSelectedSubCategory?: (cat: string) => void;

  // Promo badges lookup (item.id -> badge label e.g. "ลด 10%")
  promoBadges?: Record<number, string>;

  // Legacy single-tier support (fallback)
  categories?: string[];
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;

  filteredMenuItems: MenuItem[];
  addToCart: (item: MenuItem) => void;
  isLoadingMenu: boolean;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  categoryTree,
  selectedMainCategory,
  setSelectedMainCategory,
  selectedSubCategory,
  setSelectedSubCategory,
  promoBadges,
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredMenuItems,
  addToCart,
  isLoadingMenu,
}) => {
  // Check if we are using the 2-tier navigation
  const isDualTier = Boolean(
    categoryTree && categoryTree.length > 0 && setSelectedMainCategory,
  );

  const activeMain = selectedMainCategory ?? ALL_MAIN_CATEGORY;
  const activeSub = selectedSubCategory ?? ALL_SUB_CATEGORY;

  // Find the selected main category item in tree
  const activeMainItem = useMemo(() => {
    if (!categoryTree) return null;
    return (
      categoryTree.find(
        c =>
          normalizeCategoryName(c.name).toLowerCase() ===
          normalizeCategoryName(activeMain).toLowerCase(),
      ) ?? null
    );
  }, [categoryTree, activeMain]);

  // Subcategories available for activeMain
  const availableSubCategories = useMemo(() => {
    if (!activeMainItem || activeMain === ALL_MAIN_CATEGORY) return [];
    return activeMainItem.children || [];
  }, [activeMainItem, activeMain]);

  return (
    <div className="space-y-6">
      {/* Category Tabs: Dual-Tier or Legacy Fallback */}
      {isDualTier ? (
        <div className="space-y-2">
          {/* Row 1: Main Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none items-center">
            {/* [ ทั้งหมด ] */}
            <button
              type="button"
              onClick={() => setSelectedMainCategory!(ALL_MAIN_CATEGORY)}
              className={`badge-pill text-xs font-bold transition-all ${
                activeMain === ALL_MAIN_CATEGORY
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'badge-inactive hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
            >
              {ALL_MAIN_CATEGORY}
            </button>

            {/* Main Category Pills */}
            {categoryTree!.map(mainCat => {
              const isSelected =
                normalizeCategoryName(activeMain).toLowerCase() ===
                normalizeCategoryName(mainCat.name).toLowerCase();
              return (
                <button
                  key={mainCat.id}
                  type="button"
                  onClick={() => setSelectedMainCategory!(mainCat.name)}
                  className={`badge-pill text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'badge-inactive hover:bg-slate-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {mainCat.name}
                </button>
              );
            })}
          </div>

          {/* Row 2: Sub Categories under active Main Category */}
          {availableSubCategories.length > 0 && activeMain !== ALL_MAIN_CATEGORY && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none items-center pl-1 border-t border-slate-100 dark:border-neutral-800/60 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 mr-1 shrink-0">
                หมวดย่อย:
              </span>
              {/* [ ทั้งหมดในหมวด ] */}
              <button
                type="button"
                onClick={() => setSelectedSubCategory?.(ALL_SUB_CATEGORY)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeSub === ALL_SUB_CATEGORY
                    ? 'bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
                }`}
              >
                {ALL_SUB_CATEGORY}
              </button>

              {/* Sub Category Chips */}
              {availableSubCategories.map(subCat => {
                const isSelected =
                  normalizeCategoryName(activeSub).toLowerCase() ===
                  normalizeCategoryName(subCat.name).toLowerCase();
                return (
                  <button
                    key={subCat.id}
                    type="button"
                    onClick={() => setSelectedSubCategory?.(subCat.name)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs font-bold'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {subCat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Legacy Single-Tier Fallback */
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {(categories || []).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory?.(cat)}
              className={`badge-pill ${selectedCategory === cat ? 'bg-red-600 text-white shadow-xs' : 'badge-inactive'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Menu Grid */}
      {isLoadingMenu ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="text-center py-16 app-card app-card--compact p-8">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-body font-bold text-slate-500 dark:text-neutral-400">
            ไม่พบรายการอาหารในหมวดหมู่นี้
          </p>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(var(--grid-cols-menu), 1fr)',
            gap: 'var(--grid-gap)',
          }}
        >
          {filteredMenuItems.map(item => {
            const isOutOfStock = item.stock <= 0;
            const salePrice = menuItemSalePrice(item);
            const onHappyHour =
              item.is_happy_hour &&
              item.happy_hour_price != null &&
              salePrice === item.happy_hour_price &&
              isHappyHourNow();
            const promoBadge = promoBadges?.[item.id];

            return (
              <button
                key={item.id}
                disabled={isOutOfStock}
                onClick={() => addToCart(item)}
                className={`group relative overflow-hidden flex flex-col text-left transition duration-200 rounded-2xl ${
                  isOutOfStock
                    ? 'cursor-not-allowed bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900/60 shadow-none'
                    : 'app-card app-card--compact cursor-pointer hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {/* รูป 1:1 — เห็นสินค้าชัด · badge ทับมุมรูป */}
                <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-800">
                  {/* Promo Badge on top-left */}
                  {promoBadge && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="text-micro px-2 py-0.5 rounded-full bg-red-600 text-white font-black shadow-xs flex items-center gap-1 backdrop-blur-[2px]">
                        <Tag className="w-2.5 h-2.5 shrink-0" />
                        <span>{promoBadge}</span>
                      </span>
                    </div>
                  )}

                  {/* Stock status on top-right */}
                  <div className="absolute top-2 right-2 z-10">
                    {isOutOfStock ? (
                      <span className="text-micro px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold shadow-xs">
                        หมด
                      </span>
                    ) : (
                      <span className="text-micro px-2.5 py-0.5 rounded-full bg-black/55 text-white font-bold backdrop-blur-[2px]">
                        เหลือ {item.stock}
                      </span>
                    )}
                  </div>

                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 ${
                        isOutOfStock ? 'grayscale opacity-55' : 'group-hover:scale-105'
                      }`}
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 ${
                        isOutOfStock ? 'opacity-50' : ''
                      }`}
                    >
                      <UtensilsCrossed className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                      <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                        ไม่มีรูป
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-2.5 p-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-micro text-zinc-400 dark:text-zinc-500 uppercase block truncate">
                      {item.category}
                    </span>
                    <h3
                      className={`text-sm sm:text-base font-extrabold leading-snug line-clamp-2 ${
                        isOutOfStock
                          ? 'text-zinc-500 dark:text-zinc-400'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {item.name}
                    </h3>
                    {item.name_en && (
                      <p
                        className={`text-[11px] font-medium leading-tight truncate ${
                          isOutOfStock
                            ? 'text-zinc-400/60 dark:text-zinc-500/60'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {item.name_en}
                      </p>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-2 pt-2.5 mt-1 border-t border-white/6 dark:border-white/6">
                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {onHappyHour && (
                          <span className="text-micro text-amber-600 dark:text-amber-400 font-bold">
                            HH
                          </span>
                        )}
                        {promoBadge && (
                          <span className="text-micro text-red-600 dark:text-red-400 font-bold flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5" />
                            {promoBadge}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-base sm:text-lg font-black tabular-nums ${
                          isOutOfStock
                            ? 'text-zinc-400 dark:text-zinc-500 line-through font-semibold'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {salePrice.toLocaleString()} ฿
                      </span>
                      {onHappyHour && (
                        <span className="text-micro text-zinc-400 line-through">
                          {item.price.toLocaleString()} ฿
                        </span>
                      )}
                    </div>
                    {isOutOfStock ? (
                      <span className="text-micro text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800 font-extrabold shrink-0">
                        หมด
                      </span>
                    ) : (
                      <div className="btn-crimson w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
