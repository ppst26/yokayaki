"use client";

import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
  id?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'ค้นหา...',
  className = '',
  disabled = false,
  onClear,
  autoFocus = false,
  id,
}) => {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div
      className={`relative flex items-center h-10 rounded-xl border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/90 shadow-xs transition duration-150 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 dark:focus-within:border-red-500/80 ${
        disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-zinc-800/50' : ''
      } ${className}`}
    >
      <Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0 ml-3.5 pointer-events-none" />
      <input
        id={id}
        type="text"
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-full bg-transparent pl-2.5 pr-9 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none border-none"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="ล้างการค้นหา"
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer rounded-full transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
