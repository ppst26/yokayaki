"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check, Plus } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
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
  disabled?: boolean;
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
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; bottom?: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
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
  const displayLabel = selectedOption ? selectedOption.label : value;

  const updateCoords = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 300;
      const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setCoords({
        top: placeAbove ? 0 : rect.bottom + 4,
        bottom: placeAbove ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        width: Math.max(rect.width, 180),
        placeAbove,
      });
    }
  }, []);

  useEffect(() => {
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
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 border border-transparent transition flex items-center justify-between cursor-pointer gap-1.5 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className={`truncate text-left ${!value ? 'text-zinc-400 dark:text-zinc-500 font-normal' : ''}`}>
          {displayLabel || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-500' : ''}`} />
      </button>

      {/* Popover Dropdown (Portaled to document.body) */}
      {isOpen && mounted && createPortal(
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
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Search Box - ONLY rendered if searchable prop is TRUE */}
          {searchable && (
            <div className="p-1.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 sticky top-0 z-10">
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 border border-zinc-200/60 dark:border-zinc-700/60">
                <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="ค้นหา..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List (~10 items scrollable, ~260px max height) */}
          <div className="max-h-[260px] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/30 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-zinc-400 dark:text-zinc-500 font-medium">
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
                        ? 'bg-red-50/80 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold'
                        : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
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
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 transition flex items-center gap-1.5 cursor-pointer"
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
