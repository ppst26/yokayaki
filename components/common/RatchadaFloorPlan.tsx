"use client";

import React, { useState } from 'react';
import { ChefHat, BellRing, Armchair, Users, LayoutGrid, MapPin } from 'lucide-react';
import { getTableMeta, formatTableLabel, RATCHADA_BAR_TABLES, RATCHADA_DINING_TABLES } from '@/lib/floorLayout';
import { TableCard } from './TableCard';

export interface FloorTableItem {
  id: string;
  table_number: number;
  status: 'vacant' | 'occupied' | 'checking_out';
  updated_at?: string;
}

interface RatchadaFloorPlanProps<T extends FloorTableItem = FloorTableItem> {
  tables: T[];
  onTableClick: (table: T) => void;
}

export const RatchadaFloorPlan = <T extends FloorTableItem>({
  tables,
  onTableClick,
}: RatchadaFloorPlanProps<T>) => {
  const [viewMode, setViewMode] = useState<'plan' | 'grid'>('plan');

  // Helper หาข้อมูลโต๊ะตาม table_number
  const getTable = (num: number): T | undefined => tables.find(t => t.table_number === num);

  // Render เก้าอี้กลม (Chairs) สไตล์ 2D Architecture
  const renderChairs = (count = 2) => (
    <div className="flex justify-around items-center w-full px-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-neutral-800 dark:bg-neutral-900 border border-neutral-700/80 shadow-xs"
        />
      ))}
    </div>
  );

  // Render โต๊ะอาหาร (โต๊ะ 1, 2, 3, 4, 5) แบบ 2D Blueprint ตรงตามภาพ
  const renderDiningTable = (tableNumber: number, seats = 4) => {
    const table = getTable(tableNumber);
    const meta = getTableMeta(tableNumber, 'ratchada');
    const status = table?.status ?? 'vacant';
    const isOccupied = status === 'occupied';
    const isCheckingOut = status === 'checking_out';

    // สีโต๊ะไม้ตามสถานะ
    let tableBg = 'bg-gradient-to-b from-[#8C582A] to-[#6F421D] border-[#593414] text-white shadow-md';
    let ringStyle = '';

    if (isCheckingOut) {
      tableBg = 'bg-gradient-to-br from-red-600 via-rose-600 to-red-700 border-red-500 text-white animate-pulse shadow-xl shadow-red-600/40';
      ringStyle = 'ring-4 ring-red-400/60';
    } else if (isOccupied) {
      tableBg = 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 border-amber-600 text-white shadow-lg shadow-amber-500/30';
      ringStyle = 'ring-2 ring-amber-300/40';
    }

    return (
      <div className="flex flex-col items-center gap-1 w-full max-w-[200px] mx-auto select-none">
        {/* เก้าอี้แถวบน */}
        {renderChairs(seats === 2 ? 1 : 2)}

        {/* ตัวโต๊ะสี่เหลี่ยมไม้ */}
        <button
          type="button"
          onClick={() => table && onTableClick(table)}
          disabled={!table}
          className={`w-full py-2.5 px-3 rounded-xl border-2 transition-all duration-150 cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-0.5 ${tableBg} ${ringStyle}`}
          title={`${meta.label} (${meta.capacityLabel}) - ${status === 'vacant' ? 'ว่าง' : status === 'occupied' ? 'มีลูกค้า' : 'เรียกเช็คบิล'}`}
        >
          {/* วงกลมสีแดงหมายเลขโต๊ะ (ตรงตามรูป 2D) */}
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-600 border-2 border-white flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-xs">
              {tableNumber}
            </span>
            {isCheckingOut && <BellRing className="w-3.5 h-3.5 text-white animate-bounce" />}
          </div>

          {/* จำนวนที่นั่ง */}
          <span className="text-[11px] sm:text-xs font-semibold text-white/95">
            ({meta.capacityLabel})
          </span>

          {/* ป้ายสถานะจิ๋ว */}
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full mt-0.5 bg-black/25 text-white/90">
            {isCheckingOut ? 'เช็คบิล' : isOccupied ? 'มีลูกค้า' : 'ว่าง'}
          </span>
        </button>

        {/* เก้าอี้แถวล่าง */}
        {renderChairs(seats === 2 ? 1 : 2)}
      </div>
    );
  };

  // Render เก้าอี้บาร์กลม (บาร์ 1-7: table_number 6-12) แบบ 2D Blueprint ตรงตามภาพ
  const renderBarStool = (stoolNumber: number) => {
    const tableNumber = stoolNumber + 5; // Stool 1 -> table_number 6, Stool 7 -> table_number 12
    const table = getTable(tableNumber);
    const meta = getTableMeta(tableNumber, 'ratchada');
    const status = table?.status ?? 'vacant';
    const isOccupied = status === 'occupied';
    const isCheckingOut = status === 'checking_out';

    let stoolStyle = 'bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800';
    let ringStyle = '';

    if (isCheckingOut) {
      stoolStyle = 'bg-red-600 border-white text-white animate-pulse shadow-lg shadow-red-600/50';
      ringStyle = 'ring-4 ring-red-400';
    } else if (isOccupied) {
      stoolStyle = 'bg-amber-500 border-amber-300 text-white shadow-md shadow-amber-500/30';
      ringStyle = 'ring-2 ring-amber-300';
    }

    return (
      <button
        key={stoolNumber}
        type="button"
        onClick={() => table && onTableClick(table)}
        disabled={!table}
        title={`${meta.label} (1 ที่นั่ง) - ${status === 'vacant' ? 'ว่าง' : status === 'occupied' ? 'มีลูกค้า' : 'เรียกเช็คบิล'}`}
        className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center font-black text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-90 shadow-md ${stoolStyle} ${ringStyle}`}
      >
        <span>{stoolNumber}</span>

        {/* จุดสถานะมุม */}
        <span
          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
            isCheckingOut
              ? 'bg-rose-400 animate-ping'
              : isOccupied
              ? 'bg-amber-300'
              : 'bg-emerald-400'
          }`}
        />
      </button>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* View Switcher Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-neutral-300">
          <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span>สาขา 2 (รัชดา) • 12 จุดบริการ</span>
        </div>

        <div className="inline-flex rounded-xl p-1 bg-slate-200/70 dark:bg-neutral-800 text-xs font-semibold">
          <button
            onClick={() => setViewMode('plan')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              viewMode === 'plan'
                ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900'
            }`}
          >
            <span>ผังร้าน 2D</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>แบบการ์ด</span>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* โหมด Grid Card ปกติสำหรับกดเร็ว */
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              โต๊ะอาหาร (5 โต๊ะ)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RATCHADA_DINING_TABLES.map(num => {
                const t = getTable(num);
                if (!t) return null;
                return <TableCard key={t.id} table={t} onClick={() => onTableClick(t)} />;
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              เคาน์เตอร์บาร์ (7 ที่นั่ง)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RATCHADA_BAR_TABLES.map(num => {
                const t = getTable(num);
                if (!t) return null;
                return <TableCard key={t.id} table={t} compact onClick={() => onTableClick(t)} />;
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           ผัง 2D Architectural Blueprint ตรงตามภาพ 1:1
           ======================================================== */
        <div className="relative w-full rounded-[28px] border-4 border-[#3D2514] dark:border-neutral-800 bg-[#FAF6EE] dark:bg-neutral-950/70 p-3 sm:p-5 shadow-xl overflow-hidden">
          
          {/* แถวบนสุด (Top Wall): ครัว (ซ้าย) + ทางเข้าครัว (กลาง) + ตู้เย็น (ขวา) */}
          <div className="grid grid-cols-12 gap-2 mb-4 items-stretch">
            {/* ครัว (กล่องดำ ซ้าย) */}
            <div className="col-span-5 bg-[#2A2D34] text-white rounded-xl p-3 flex flex-col items-center justify-center border border-neutral-700 shadow-sm">
              <ChefHat className="w-5 h-5 text-white mb-0.5" />
              <span className="text-sm font-black tracking-wide">ครัว</span>
            </div>

            {/* ทางเข้าครัว (กล่องน้ำเงิน กลาง-ขวา) */}
            <div className="col-span-5 bg-[#205493] text-white rounded-xl p-3 flex items-center justify-center border border-blue-900 shadow-sm">
              <span className="text-xs sm:text-sm font-bold tracking-tight">ทางเข้าครัว</span>
            </div>

            {/* ตู้เย็น (กล่องเทา ริมขวาสุด) */}
            <div className="col-span-2 bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded-xl p-2 flex items-center justify-center border border-slate-300 dark:border-neutral-700 text-center text-caption font-bold">
              ตู้เย็น
            </div>
          </div>

          {/* โซนหลักกลางร้าน (Main Area): ฝั่งซ้าย vs ฝั่งขวา */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4 items-start">
            
            {/* ---------------- ฝั่งซ้าย (5 คอลัมน์) ---------------- */}
            <div className="col-span-5 space-y-6">
              
              {/* เคาน์เตอร์บาร์ส่วนเลี้ยวแนวนอน + แจกันดอกไม้ (ตรงตามภาพ 2D) */}
              <div className="relative w-full h-24 rounded-2xl bg-gradient-to-r from-[#7B4620] via-[#8C582A] to-[#6E3C18] border-2 border-[#542B0D] p-2 flex flex-col justify-between shadow-md">
                <span className="text-[11px] font-bold text-amber-100/90 text-center leading-tight">
                  เคาน์เตอร์บาร์<br />(7 ที่นั่ง)
                </span>
                {/* แจกันดอกไม้สีชมพูตรงมุม */}
                <div className="flex items-center justify-center text-lg drop-shadow-sm select-none" title="แจกันดอกไม้">
                  🌸
                </div>
              </div>

              {/* โต๊ะ 1 (4 ที่นั่ง) */}
              <div className="pt-2">
                {renderDiningTable(1, 4)}
              </div>

              {/* โต๊ะ 2 (4 ที่นั่ง) */}
              <div className="pt-2">
                {renderDiningTable(2, 4)}
              </div>
            </div>

            {/* ---------------- ฝั่งขวา (7 คอลัมน์) ---------------- */}
            <div className="col-span-7 space-y-4">
              
              {/* เคาน์เตอร์บาร์แนวตั้ง + เก้าอี้บาร์ 1-7 เรียงแถวแนวตั้ง (ตรงตามภาพ 2D) */}
              <div className="flex items-start gap-3 pl-1">
                {/* แถบไม้เคาน์เตอร์บาร์แนวตั้ง */}
                <div className="w-8 sm:w-10 self-stretch min-h-[290px] rounded-xl bg-gradient-to-b from-[#8C582A] via-[#7B4620] to-[#6E3C18] border-2 border-[#542B0D] flex flex-col items-center justify-center shadow-md">
                  <span className="text-[10px] font-bold text-amber-200/80 -rotate-90 whitespace-nowrap tracking-wider select-none">
                    BAR COUNTER
                  </span>
                </div>

                {/* เก้าอี้บาร์ 1 ถึง 7 เรียงแนวตั้งตรงเป๊ะตามรูป */}
                <div className="flex flex-col justify-between py-1 gap-2.5 sm:gap-3">
                  {[1, 2, 3, 4, 5, 6, 7].map(stoolNum => (
                    <div key={stoolNum} className="flex items-center gap-2">
                      {renderBarStool(stoolNum)}
                      <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 hidden sm:inline">
                        บาร์ {stoolNum}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* เส้นแบ่งพื้นที่ใต้บาร์ */}
              <div className="border-t border-dashed border-amber-900/20 dark:border-neutral-800 my-2" />

              {/* โต๊ะ 3 (2 ที่นั่ง) — อยู่ใต้บาร์ 7 พอดี */}
              <div className="pt-1">
                {renderDiningTable(3, 2)}
              </div>

              {/* โต๊ะ 4 (4 ที่นั่ง) */}
              <div className="pt-2">
                {renderDiningTable(4, 4)}
              </div>

              {/* โต๊ะ 5 (4 ที่นั่ง) */}
              <div className="pt-2">
                {renderDiningTable(5, 4)}
              </div>
            </div>

          </div>

          {/* แถวล่างสุด (Bottom Wall): ประตู Shoji ญี่ปุ่น + ทางเข้า (หน้าร้าน) */}
          <div className="mt-8 pt-3 border-t-2 border-[#3D2514] flex items-center justify-between gap-2">
            {/* Shoji Door ซ้าย */}
            <div className="w-20 sm:w-28 h-8 rounded-lg border-2 border-[#542B0D] bg-gradient-to-r from-amber-200/70 to-amber-100/50 flex items-center justify-center shadow-inner">
              <div className="grid grid-cols-3 gap-1 w-full h-full p-1 opacity-70">
                <div className="border border-[#7B4620]/40 rounded-xs" />
                <div className="border border-[#7B4620]/40 rounded-xs" />
                <div className="border border-[#7B4620]/40 rounded-xs" />
              </div>
            </div>

            {/* ทางเข้าหน้าร้าน ตรงกลาง (มีลูกศรสีแดงชี้ขึ้น) */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-red-600 text-sm sm:text-base font-black leading-none animate-bounce">
                ▲
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                ทางเข้า (หน้าร้าน)
              </span>
            </div>

            {/* Shoji Door ขวา */}
            <div className="w-20 sm:w-28 h-8 rounded-lg border-2 border-[#542B0D] bg-gradient-to-r from-amber-100/50 to-amber-200/70 flex items-center justify-center shadow-inner">
              <div className="grid grid-cols-3 gap-1 w-full h-full p-1 opacity-70">
                <div className="border border-[#7B4620]/40 rounded-xs" />
                <div className="border border-[#7B4620]/40 rounded-xs" />
                <div className="border border-[#7B4620]/40 rounded-xs" />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
