"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check, Plus } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
  shortLabel?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  addNewLabel?: string;
  onAddNew?: () => void;
  searchable?: boolean; // Default false. Only shows search input when true
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  /** จุดอ้างอิงตำแหน่ง dropdown (เช่น pill ที่ห่อ label + select) */
  menuAnchorRef?: React.RefObject<HTMLElement | null>;
  /** ความกว้างขั้นต่ำของ dropdown */
  menuMinWidth?: number;
  /** ไอคอนหน้า label */
  icon?: React.ReactNode;
  /** ป้ายชื่อหัวข้อด้านหน้า เช่น "สต็อก:", "จัดเรียง:", "HH:" */
  prefixLabel?: string;
  /** ขนาดของ Select: 'md' (ปกติ) หรือ 'sm' (กะทัดรัด) */
  size?: 'md' | 'sm';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '-- เลือก --',
  addNewLabel = '+ เพิ่มรายการใหม่...',
  onAddNew,
  searchable = false,
  className = '',
  triggerClassName = '',
  disabled = false,
  menuAnchorRef,
  menuMinWidth = 180,
  icon,
  prefixLabel,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; bottom?: number; left: number; width: number; placeAbove: boolean } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize options to { label, value } objects
  const normalizedOptions: SelectOption[] = React.useMemo(() => {
    return options.map(opt =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    );
  }, [options]);

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayLabel = selectedOption ? (selectedOption.shortLabel || selectedOption.label) : value;

  const updateCoords = useCallback(() => {
    const anchor = menuAnchorRef?.current ?? triggerRef.current ?? containerRef.current;
    if (!anchor) return null;

    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 300;
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const newCoords = {
      top: placeAbove ? 0 : rect.bottom + 4,
      bottom: placeAbove ? window.innerHeight - rect.top + 4 : undefined,
      left: rect.left,
      width: Math.max(rect.width, menuMinWidth),
      placeAbove,
    };
    setCoords(newCoords);
    return newCoords;
  }, [menuAnchorRef, menuMinWidth]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={
          triggerClassName ||
          `w-full h-10 bg-white dark:bg-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl ${
            size === 'sm'
              ? 'px-2.5 text-xs gap-1.5'
              : 'px-3.5 text-xs sm:text-sm gap-2'
          } font-semibold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 shadow-xs transition duration-150 flex items-center justify-between cursor-pointer ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-zinc-800/50' : ''
          } ${isOpen ? 'border-red-500 ring-2 ring-red-500/20' : ''}`
        }
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          {prefixLabel && (
            <span className="shrink-0 text-xs font-extrabold text-slate-500 dark:text-zinc-400">
              {prefixLabel}
            </span>
          )}
          <span className={`truncate text-left ${!value ? 'text-slate-400 dark:text-zinc-500 font-normal' : ''}`}>
            {displayLabel || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-400 dark:text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-red-500' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown (Portaled to document.body) */}
      {isOpen && mounted && coords && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            ...(coords.placeAbove
              ? { bottom: `${coords.bottom}px` }
              : { top: `${coords.top}px` }
            ),
            zIndex: 99999,
          }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Search Box - ONLY rendered if searchable prop is TRUE */}
          {searchable && (
            <div className="p-1.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 sticky top-0 z-10">
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-zinc-700">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="ค้นหา..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List (~10 items scrollable, ~260px max height) */}
          <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/50 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400 dark:text-zinc-500 font-medium">
                ไม่พบรายการ
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold'
                        : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="truncate pr-2">{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Sticky Bottom Add New Button */}
          {onAddNew && (
            <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 p-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-10">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearch('');
                  onAddNew();
                }}
                className="w-full text-left px-3 py-2 rounded-sm text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                <span className="truncate">{addNewLabel}</span>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
