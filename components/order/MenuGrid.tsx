"use client";

import React from 'react';
import { UtensilsCrossed, Plus } from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  price: number;
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMenuItems.map(item => {
            const isOutOfStock = item.stock <= 0;
            return (
              <button
                key={item.id}
                disabled={isOutOfStock}
                onClick={() => addToCart(item)}
                className={`group relative rounded-2xl p-4 flex flex-col justify-between text-left transition duration-200 overflow-hidden ${
                  isOutOfStock
                    ? 'cursor-not-allowed bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900/60 shadow-none'
                    : 'cursor-pointer bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs hover:border-slate-300 hover:shadow-md active:scale-95'
                }`}
              >
                {/* Stock Quantity Badge at Top Right */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  {isOutOfStock ? (
                    <span className="text-micro px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold shadow-xs">
                      หมด
                    </span>
                  ) : (
                    <span className="text-micro px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      เหลือ {item.stock}
                    </span>
                  )}
                </div>

                {item.image_url ? (
                  <div className="w-full h-24 mb-3 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-105'
                      }`}
                    />
                  </div>
                ) : null}

                <div className="space-y-1 mb-3 pr-12">
                  <span className="text-micro text-zinc-400 dark:text-zinc-500 uppercase block">
                    {item.category}
                  </span>
                  <h3 className={`text-h3 line-clamp-2 ${
                    isOutOfStock ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {item.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 w-full">
                  <span className={`text-price text-h3 ${
                    isOutOfStock ? 'text-zinc-400 dark:text-zinc-500 line-through font-semibold' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {item.price.toLocaleString()} ฿
                  </span>
                  {isOutOfStock ? (
                    <span className="text-micro text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 font-extrabold">
                      สินค้าหมด
                    </span>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center transition">
                      <Plus className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
