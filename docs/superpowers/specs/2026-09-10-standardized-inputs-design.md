# 🎨 Standardized Inputs & Dropdowns Design Specification

> **Date:** 2026-09-10  
> **Topic:** Unified styling and high-contrast design for SearchBar, Select, and Dropdowns across all pages in YOKAYAKI POS.

---

## 📌 1. Overview & Problem Statement

Currently, search inputs and dropdowns across YOKAYAKI POS pages have diverging shapes, heights, and borders:
- **MenuManager**: Search and dropdowns use compact heights (`py-1.5`, ~32px) and are styled like capsule pills (`rounded-xl` on low height). Dropdown triggers wrap custom `<span>` labels in an outer `<div>` pill container.
- **IngredientPurchaseManager (Stock)**: Search input uses `h-10 rounded-xl` with grey background (`bg-zinc-100 dark:bg-zinc-800/80`) and no border (`border-transparent`).
- **LoyaltyManager**: Search input is in a white pill with `border-slate-200/80`, while the dropdowns use rectangular `CustomSelect` triggers.
- **Theme Visibility & Contrast**: In Light Theme, white controls on off-white/light-slate backgrounds wash out when borders are faint (`border-slate-200`) or transparent. In Dark Theme, inputs with `dark:bg-neutral-900 border-neutral-800` blend into dark card backgrounds.

### Target Outcome
1. **Unified Shape & Dimensions**: All searchbars and select/dropdown controls share `rounded-xl` corners and standard `h-10` (40px) height.
2. **High Clarity & Visibility in All Themes**:
   - **Light Theme**: `bg-white` + distinct `border border-slate-300 hover:border-slate-400` + subtle `shadow-xs`.
   - **Dark Theme**: `dark:bg-zinc-800/90 dark:hover:bg-zinc-800` (visibly elevated above `zinc-900` card surfaces) + `dark:border-zinc-700/80 dark:hover:border-zinc-600`.
   - **Focus State**: Brand crimson accent `focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500`.
3. **Clean Component Abstractions**:
   - Create reusable `SearchInput` component.
   - Upgrade `CustomSelect` to natively support `prefixLabel` and default to standard `h-10 rounded-xl` trigger styling.

---

## 🧱 2. Component Specifications

### 2.1 Reusable `SearchInput` (`components/ui/search-input.tsx`)

A single standardized search input component used across all manager pages and modals.

```tsx
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
```

#### Visual & Behavioral Specifications:
- **Container**: `relative flex items-center h-10 rounded-xl border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/90 shadow-xs transition duration-150 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 dark:focus-within:border-red-500/80`
- **Left Search Icon**: `<Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0 ml-3 pointer-events-none" />`
- **Input Element**: `w-full h-full bg-transparent pl-2.5 pr-8 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none`
- **Right Clear (X) Button**: Displayed when `value` is non-empty:
  - `<button type="button" onClick={handleClear} className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer rounded-full transition"><X className="w-3.5 h-3.5" /></button>`

---

### 2.2 Upgraded `CustomSelect` (`components/ui/select.tsx`)

Enhance `CustomSelect` with `prefixLabel` support and align its default trigger styling with `SearchInput`.

#### Added Props:
- `prefixLabel?: string`: Optional prefix label rendered with strong contrast inside the trigger (e.g., `'สต็อก:'`, `'จัดเรียง:'`, `'HH:'`, `'รูป:'`, `'ช่วงเวลา:'`).
- `prefixIcon?: React.ReactNode`: Optional icon rendered before the label (reuses existing `icon` prop or `prefixIcon`).

#### Trigger Button Default Styles:
- **Container**: `h-10 w-full flex items-center justify-between gap-2 px-3.5 rounded-xl border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 transition duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer`
- **Prefix Label Element**: `<span className="text-xs font-extrabold text-slate-500 dark:text-zinc-400 shrink-0">{prefixLabel}</span>`
- **ChevronDown Icon**: `w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-500' : ''}`

#### Popover Dropdown Enhancement:
- **Surface**: `bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden`
- **Search Inside Popover**: Input container upgraded to match high-contrast styles (`bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg`).
- **Options List**: `hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200`, selected item: `bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold`.

---

## 📱 3. Affected Pages & Refactoring Plan

### 3.1 `MenuManager.tsx` (`components/menu/MenuManager.tsx`)
- Replace custom search `<div>...<input>...</div>` with `<SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ค้นหาชื่อเมนู..." className="w-full sm:w-64" />`.
- Refactor filter pills:
  - Remove outer `<div ref={...AnchorRef} className="flex shrink-0 items-center gap-1.5 rounded-xl border ...">` wrappers.
  - Render `<CustomSelect prefixLabel="สต็อก:" value={filterStock} onChange={...} options={STOCK_FILTER_OPTIONS} className="w-auto min-w-[130px]" />`.
  - Render `<CustomSelect prefixLabel="จัดเรียง:" ... className="w-auto min-w-[145px]" />`.
  - Render `<CustomSelect prefixLabel="HH:" ... className="w-auto min-w-[115px]" />`.
  - Render `<CustomSelect prefixLabel="รูป:" ... className="w-auto min-w-[115px]" />`.
- All controls now align horizontally at exactly `h-10` (40px) with identical border and background styling.

### 3.2 `IngredientPurchaseManager.tsx` (`components/stock/IngredientPurchaseManager.tsx`)
- Replace search input with `<SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ค้นหา PO# หรือชื่อผู้สั่งซื้อ" className="flex-1 min-w-[200px]" />`.
- Replace date filter trigger with default `CustomSelect` trigger:
  - `<CustomSelect value={dateFilter} onChange={...} options={DATE_FILTER_OPTIONS} icon={<Calendar className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0" />} className="w-[190px] sm:w-[220px]" />`.

### 3.3 `LoyaltyManager.tsx` (`components/loyalty/LoyaltyManager.tsx`)
- Replace search input with `<SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ค้นหาชื่อหรือเบอร์โทร..." className="flex-1 min-w-[200px]" />`.
- Update `dormantDays`, `tagFilter`, and `rfmFilter` `CustomSelect` dropdowns to use standard `h-10 rounded-xl` trigger without conflicting overrides.

### 3.4 `DateFilterBar.tsx` (`components/dashboard/DateFilterBar.tsx`)
- Align border and background colors of preset filter trigger and custom date picker button to match standard:
  - `border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/90 hover:border-slate-400 dark:hover:border-zinc-600 shadow-xs`.

---

## 🧪 4. Testing & Verification

1. **Theme Switching Verification**:
   - Toggle theme between Light and Dark mode using the SidebarNav theme toggle button.
   - Verify that all search inputs and dropdowns maintain crisp boundaries, distinct surfaces, and clear contrast in both modes.
2. **Interactive States**:
   - Verify hover state: subtle border darkening.
   - Verify focus state: crimson ring and border.
   - Verify clear button: clicking `X` clears input and restores placeholder.
   - Verify dropdown selection: opens popover, selects option, displays active option with checkmark.
3. **Responsive Layouts**:
   - Check desktop, tablet (iPad 1024x768 / 1180x820), and mobile views to ensure filter rows scroll horizontally or wrap neatly without overflow issues.
