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
    <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 p-3 flex items-center gap-3 backdrop-blur-sm">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
        <Flame className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-amber-300">Happy Hour ตอนนี้!</p>
        <p className="text-xs text-amber-400/80">17:00 – 19:00 น. ราคาพิเศษสำหรับเมนูที่ร่วมรายการ</p>
      </div>
      <div className="ml-auto shrink-0">
        <Clock className="w-4 h-4 text-amber-500" />
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
  const onHappyHour = item.is_happy_hour && item.happy_hour_price != null && salePrice === item.happy_hour_price && isHH;
  const isOutOfStock = item.is_stock_tracked && item.stock <= 0;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
        isOutOfStock
          ? 'border-white/5 bg-white/3 opacity-50'
          : 'border-white/10 bg-white/5 hover:border-amber-500/30 hover:bg-white/8 hover:shadow-xl hover:shadow-black/30'
      }`}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-neutral-900 overflow-hidden">
        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {onHappyHour && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-black font-black flex items-center gap-1 shadow-md">
              <Flame className="w-2.5 h-2.5" /> HH
            </span>
          )}
        </div>
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="text-sm font-black text-rose-400 tracking-widest uppercase">หมด</span>
          </div>
        )}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${
              !isOutOfStock ? 'group-hover:scale-105' : 'grayscale'
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-30">
            <UtensilsCrossed className="w-10 h-10 text-neutral-400" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-500/70 truncate">
          {item.category}
        </p>
        <h3 className="text-sm font-bold leading-snug line-clamp-2 text-white/90">
          {item.name}
        </h3>
        {item.name_en && (
          <p className="text-[11px] font-medium text-white/40 truncate">{item.name_en}</p>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col items-start">
            {onHappyHour && (
              <span className="text-[11px] text-white/40 line-through tabular-nums">
                {item.price.toLocaleString()} ฿
              </span>
            )}
            <span
              className={`text-base font-black tabular-nums ${
                onHappyHour ? 'text-amber-400' : 'text-amber-500'
              }`}
            >
              {salePrice.toLocaleString()} ฿
            </span>
          </div>
          {onHappyHour && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold border border-amber-500/20">
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3 flex flex-col gap-3">
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
              <p className="text-[10px] text-amber-500/70 font-semibold tracking-widest uppercase">
                Digital Menu
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-white/40 font-medium">ดูเมนูเท่านั้น</p>
              <p className="text-[10px] text-white/30">สั่งอาหารกับพนักงาน</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs — Main */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => handleSelectMain(ALL_MAIN_CATEGORY)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedMain === ALL_MAIN_CATEGORY
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                  : 'bg-white/8 text-white/60 hover:bg-white/12'
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
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'bg-white/8 text-white/60 hover:bg-white/12'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sub Category Tabs */}
          {availableSubs.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5 pl-1">
              <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0 self-center" />
              <button
                onClick={() => setSelectedSub(ALL_SUB_CATEGORY)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedSub === ALL_SUB_CATEGORY
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                ทั้งหมดในหมวด
              </button>
              {availableSubs.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSub(sub.name)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedSub === sub.name
                      ? 'bg-white/15 text-white'
                      : 'text-white/40 hover:text-white/60'
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
            <UtensilsCrossed className="w-12 h-12 text-white/15" />
            <p className="text-white/40 text-sm font-medium">ไม่พบรายการในหมวดหมู่นี้</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-white/30 mb-4 font-medium">
              {filteredItems.length} รายการ
              {searchQuery && (
                <> สำหรับ &ldquo;<span className="text-amber-500/70">{searchQuery}</span>&rdquo;</>
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
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-[10px] text-white/20">
          สอบถามรายละเอียดและสั่งอาหารกับพนักงานได้เลยครับ/ค่ะ
        </p>
        <p className="text-[10px] text-amber-600/30 mt-1 font-semibold tracking-wider">
          YO-YAKI IZAKAYA
        </p>
      </footer>
    </div>
  );
}

