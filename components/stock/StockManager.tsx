"use client";

import React from 'react';
import { Boxes } from 'lucide-react';
import { IngredientPurchaseManager } from '@/components/stock/IngredientPurchaseManager';

export const StockManager: React.FC = () => {
  return (
    <div className="w-full text-zinc-800 dark:text-zinc-100 font-sans space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-red-600 dark:text-red-400" />
            จัดการต้นทุนวัตถุดิบ & สต็อก
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5">
            บันทึกการจัดซื้อวัตถุดิบทำเมนู (แซลมอน, เบียร์สด ฯลฯ) พร้อมสรุปยอดต้นทุนและตัวกรองรายงานตามช่วงเวลา
          </p>
        </div>
      </div>

      {/* Main Procurement PO Manager View */}
      <IngredientPurchaseManager />
    </div>
  );
};
