"use client";

import React from 'react';
import { Boxes } from 'lucide-react';
import { IngredientPurchaseManager } from '@/components/stock/IngredientPurchaseManager';

export const StockManager: React.FC = () => {
  return (
    <div className="w-full text-zinc-800 dark:text-zinc-100 font-sans space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-[50%]">
          <h1 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>จัดการสต็อก</span>
          </h1>
          <p className="text-caption mt-0.5">
            บันทึกการจัดซื้อวัตถุดิบทำเมนู 
          </p>
        </div>
      </div>

      {/* Main Procurement PO Manager View */}
      <IngredientPurchaseManager />
    </div>
  );
};
