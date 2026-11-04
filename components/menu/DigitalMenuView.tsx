'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { UtensilsCrossed, Clock, Flame, ChevronRight, Search, X } from 'lucide-react';
import { isHappyHourNow, menuItemSalePrice, type MenuPriceFields } from '@/lib/menuPrice';
import {
  buildCategoryTreeWithFallback,
  filterMenuItemsByCategory,
  ALL_MAIN_CATEGORY,
  ALL_SUB_CATEGORY,
  type MenuCategoryRow,
  type CategoryTreeItem,
} from '@/lib/menuCategories';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DigitalMenuItem extends MenuPriceFields {
  id: number;
  name: string;
  name_en?: string | null;
  stock: number;
  is_stock_tracked: boolean;
  category: string;
  image_url?: string | null;
  is_available: boolean;
}

export interface DigitalMenuViewProps {
  initialItems: DigitalMenuItem[];
  initialCategories: MenuCategoryRow[];
}

// ─── Happy Hour Banner ───────────────────────────────────────────────────────

function HappyHourBanner() {
  const [isHH, setIsHH] = useState(false);

  useEffect(() => {
    setIsHH(isHappyHourNow());
    const timer = setInterval(() => setIsHH(isHappyHourNow()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!isHH) return null;

  return (
    <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-r from-red-950/60 via-red-900/30 to-zinc-900 border border-red-800/40 p-3 flex items-center gap-3 backdrop-blur-sm">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
        <Flame className="w-5 h-5 text-red-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-red-200">Happy Hour ตอนนี้!</p>
        <p className="text-xs text-red-300/70">17:00 – 19:00 น. ราคาพิเศษสำหรับเมนูที่ร่วมรายการ</p>
      </div>
      <div className="ml-auto shrink-0">
        <Clock className="w-4 h-4 text-red-400" />
      </div>
    </div>
  );
}

// ─── Menu Item Card ───────────────────────────────────────────────────────────

interface MenuCardProps {
  item: DigitalMenuItem;
  isHH: boolean;
}

function MenuCard({ item, isHH }: MenuCardProps) {
  const salePrice = menuItemSalePrice(item);
  const onHappyHour =
    item.is_happy_hour &&
    item.happy_hour_price != null &&
    salePrice === item.happy_hour_price &&
    isHH;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-red-600/50 hover:bg-zinc-900 transition-all duration-200 shadow-sm hover:shadow-lg">
      {/* Image (1:1 Square matching app POS theme) */}
      <div className="relative w-full aspect-square bg-zinc-800 overflow-hidden">
        {onHappyHour && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-black flex items-center gap-1 shadow-md">
              <Flame className="w-2.5 h-2.5" /> HH
            </span>
          </div>
        )}

        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-30">
            <UtensilsCrossed className="w-8 h-8 text-zinc-400" />
            <span className="text-[10px] font-semibold text-zinc-500">ไม่มีรูป</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        <span className="text-[10px] uppercase tracking-wider font-bold text-red-500/80 block truncate">
          {item.category}
        </span>
        <h3 className="text-sm sm:text-base font-extrabold leading-snug line-clamp-2 text-zinc-100">
          {item.name}
        </h3>
        {item.name_en && (
          <p className="text-[11px] font-medium text-zinc-400 truncate">{item.name_en}</p>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2 border-t border-zinc-800/60">
          <div className="flex flex-col items-start min-w-0">
            {onHappyHour && (
              <span className="text-[11px] text-zinc-400 line-through tabular-nums">
                {item.price.toLocaleString()} ฿
              </span>
            )}
            <span className="text-base sm:text-lg font-black text-red-500 tabular-nums">
              {salePrice.toLocaleString()} ฿
            </span>
          </div>
          {onHappyHour && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-600/15 text-red-400 font-bold border border-red-600/30">
              ราคา HH
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function DigitalMenuView({ initialItems, initialCategories }: DigitalMenuViewProps) {
  const [selectedMain, setSelectedMain] = useState(ALL_MAIN_CATEGORY);
  const [selectedSub, setSelectedSub] = useState(ALL_SUB_CATEGORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHH, setIsHH] = useState(false);

  useEffect(() => {
    setIsHH(isHappyHourNow());
    const timer = setInterval(() => setIsHH(isHappyHourNow()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const categoryTree: CategoryTreeItem[] = useMemo(
    () => buildCategoryTreeWithFallback(initialCategories, initialItems),
    [initialCategories, initialItems],
  );

  const activeMainItem = useMemo(
    () => categoryTree.find(c => c.name === selectedMain) ?? null,
    [categoryTree, selectedMain],
  );

  const availableSubs = useMemo(
    () => (activeMainItem && selectedMain !== ALL_MAIN_CATEGORY ? activeMainItem.children : []),
    [activeMainItem, selectedMain],
  );

  const filteredItems = useMemo(() => {
    let items = filterMenuItemsByCategory(initialItems, selectedMain, selectedSub, categoryTree);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        it =>
          it.name.toLowerCase().includes(q) ||
          (it.name_en?.toLowerCase().includes(q) ?? false) ||
          it.category.toLowerCase().includes(q),
      );
    }
    return items;
  }, [initialItems, selectedMain, selectedSub, categoryTree, searchQuery]);

  const handleSelectMain = (cat: string) => {
    setSelectedMain(cat);
    setSelectedSub(ALL_SUB_CATEGORY);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 pt-3.5 pb-3 flex flex-col gap-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src="/branding/logo.png"
                alt="Yo-Yaki Izakaya"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wide text-white leading-tight">
                YO-YAKI IZAKAYA
              </h1>
              <p className="text-[11px] text-red-500 font-bold uppercase tracking-wider">
                รายการอาหาร
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] text-zinc-400 font-medium">สั่งอาหารกับพนักงาน</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-9 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:bg-zinc-850 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs — Main (Red pill matching MenuGrid) */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => handleSelectMain(ALL_MAIN_CATEGORY)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedMain === ALL_MAIN_CATEGORY
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              ทั้งหมด
            </button>
            {categoryTree.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleSelectMain(cat.name)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedMain === cat.name
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sub Category Tabs */}
          {availableSubs.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5 pl-1 border-t border-zinc-800/60 pt-2 items-center">
              <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1 shrink-0">
                หมวดย่อย:
              </span>
              <button
                onClick={() => setSelectedSub(ALL_SUB_CATEGORY)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSub === ALL_SUB_CATEGORY
                    ? 'bg-white text-zinc-900 font-bold shadow-xs'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                ทั้งหมดในหมวด
              </button>
              {availableSubs.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSub(sub.name)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedSub === sub.name
                      ? 'bg-white text-zinc-900 font-bold shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Happy Hour Banner ── */}
      <HappyHourBanner />

      {/* ── Menu Grid ── */}
      <main className="max-w-4xl mx-auto px-4 py-5">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <UtensilsCrossed className="w-12 h-12 text-zinc-700" />
            <p className="text-zinc-500 text-sm font-medium">ไม่พบรายการในหมวดหมู่นี้</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-500 mb-4 font-semibold">
              {filteredItems.length} รายการ
              {searchQuery && (
                <> สำหรับ &ldquo;<span className="text-red-400">{searchQuery}</span>&rdquo;</>
              )}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredItems.map(item => (
                <MenuCard key={item.id} item={item} isHH={isHH} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center border-t border-zinc-900">
        <p className="text-xs text-zinc-500">
          สอบถามรายละเอียดและสั่งอาหารกับพนักงานได้เลยครับ/ค่ะ
        </p>
        <p className="text-xs text-red-500/50 mt-1 font-bold tracking-wider">
          YO-YAKI IZAKAYA
        </p>
      </footer>
    </div>
  );
}
