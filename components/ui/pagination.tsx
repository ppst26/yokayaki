"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from '@/components/ui/select';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className = '',
}) => {
  const safeTotalPages = Math.max(1, totalPages);

  const selectOptions = pageSizeOptions.map(size => ({
    label: `${size} รายการ`,
    value: String(size),
  }));

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-3 text-sm font-semibold text-slate-500 dark:text-neutral-400 ${className}`}>
      {/* Left Side: Page Size Selector & Total Counter */}
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-slate-600 dark:text-neutral-300 shrink-0 text-sm">
          แสดงหน้า:
        </span>
        <div className="w-36">
          <CustomSelect
            value={String(pageSize)}
            onChange={val => onPageSizeChange(Number(val))}
            options={selectOptions}
            searchable={false}
            triggerClassName="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl px-3 py-1.5 text-sm font-black text-slate-800 dark:text-neutral-100 shadow-2xs transition flex items-center justify-between cursor-pointer gap-1.5"
          />
        </div>
        <span className="text-table-meta">
          (ทั้งหมด {totalItems} รายการ)
        </span>
      </div>

      {/* Right Side: Prev / Next Buttons & Page Counter */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-2 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-neutral-200 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 rounded-xl transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer flex items-center justify-center"
          title="หน้าถัดไปถอยหลัง"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-black text-slate-700 dark:text-neutral-200 px-1">
          หน้า {currentPage} / {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
          disabled={currentPage >= safeTotalPages}
          className="p-2 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-neutral-200 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 rounded-xl transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer flex items-center justify-center"
          title="หน้าถัดไป"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
