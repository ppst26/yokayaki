"use client";

import React from 'react';
import { UtensilsCrossed, Plus } from 'lucide-react';
import { isHappyHourNow, menuItemSalePrice, type MenuPriceFields } from '@/lib/menuPrice';

interface MenuItem extends MenuPriceFields {
  id: number;
  name: string;
  stock: number;
  category: string;
  image_url?: string | null;
}

interface MenuGridProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  filteredMenuItems: MenuItem[];
  addToCart: (item: MenuItem) => void;
  isLoadingMenu: boolean;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredMenuItems,
  addToCart,
  isLoadingMenu,
}) => {
  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`badge-pill ${selectedCategory === cat ? 'badge-active' : 'badge-inactive'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      {isLoadingMenu ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-body font-bold text-slate-500 dark:text-neutral-400">
            ไม่พบรายการอาหารในหมวดหมู่นี้
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredMenuItems.map(item => {
            const isOutOfStock = item.stock <= 0;
            const salePrice = menuItemSalePrice(item);
            const onHappyHour =
              item.is_happy_hour &&
              item.happy_hour_price != null &&
              salePrice === item.happy_hour_price &&
              isHappyHourNow();
            return (
              <button
                key={item.id}
                disabled={isOutOfStock}
                onClick={() => addToCart(item)}
                className={`group relative rounded-2xl overflow-hidden flex flex-col text-left transition duration-200 ${
                  isOutOfStock
                    ? 'cursor-not-allowed bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900/60 shadow-none'
                    : 'cursor-pointer bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs hover:border-slate-300 hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {/* รูป 1:1 — เห็นสินค้าชัด · badge ทับมุมรูป */}
                <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-800">
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
                  </div>

                  <div className="flex items-end justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                      {onHappyHour && (
                        <span className="text-micro text-amber-600 dark:text-amber-400 font-bold">
                          HH
                        </span>
                      )}
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
                      <div className="w-8 h-8 rounded-sm bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center transition shrink-0">
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
