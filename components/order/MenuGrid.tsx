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
            className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
            }`}
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
          <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
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
                className={`group relative bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-4 flex flex-col justify-between text-left transition duration-200 active:scale-95 shadow-sm overflow-hidden ${
                  isOutOfStock
                    ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-neutral-800/40'
                    : 'hover:border-red-400 dark:hover:border-red-500 hover:shadow-md cursor-pointer'
                }`}
              >
                {item.image_url ? (
                  <div className="w-full h-24 mb-3 rounded-xl overflow-hidden bg-slate-100 dark:bg-neutral-800">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : null}

                <div className="space-y-1 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider block">
                    {item.category}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-neutral-100 line-clamp-2">
                    {item.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800 w-full">
                  <span className="font-black text-red-600 dark:text-red-400 text-base">
                    {item.price.toLocaleString()} ฿
                  </span>
                  {isOutOfStock ? (
                    <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/50">
                      หมด
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
