# Menu Manager & Loyalty Manager Pagination Design Spec

## 1. Overview
Add client-side pagination controls with page size options (10, 20, 50 items per page) to the bottom of tables in `MenuManager.tsx` and `LoyaltyManager.tsx`. This improves performance, scannability, and UX when dealing with large menu catalogs or customer member databases.

## 2. Target Views & Requirements

### Target Components
1. `components/MenuManager.tsx`: Main menu items table.
2. `components/LoyaltyManager.tsx`: Main members list table.

### Key Requirements
- **Page Size Options**: Select dropdown with options `10`, `20`, `50` per page (default `10`).
- **Pagination Controls**:
  - `ChevronLeft` (Previous) and `ChevronRight` (Next) buttons.
  - Numbered page buttons for quick navigation (highlight active page in Yokayaki red `bg-red-600 text-white`).
  - Disable Prev button on page 1, Disable Next button on last page.
- **Range & Total Display Text**:
  - Format: `แสดง X - Y จากทั้งหมด Z รายการ` (or `คน` for members).
- **Auto-reset State**:
  - Reset `currentPage` to 1 whenever search query, category filter, or page size dropdown changes.

## 3. Component Architecture & Data Flow

### State Variables in MenuManager.tsx & LoyaltyManager.tsx
- `currentPage`: number (default `1`)
- `pageSize`: number (default `10`)

### Computation Logic
```typescript
const totalItems = filteredItems.length;
const totalPages = Math.ceil(totalItems / pageSize) || 1;
const startIndex = (currentPage - 1) * pageSize;
const endIndex = Math.min(startIndex + pageSize, totalItems);
const paginatedItems = filteredItems.slice(startIndex, endIndex);
```

### Auto-reset Effect
```typescript
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, filterCategory, pageSize]);
```

## 4. UI Specification for Table Footer

```tsx
<div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
  {/* Left: Items per page & Range text */}
  <div className="flex items-center gap-3 text-slate-500 font-semibold">
    <div className="flex items-center gap-1.5">
      <span>แสดง</span>
      <select
        value={pageSize}
        onChange={(e) => setPageSize(Number(e.target.value))}
        className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-red-500 cursor-pointer"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
      <span>รายการ/หน้า</span>
    </div>
    <span className="hidden sm:inline text-slate-300">|</span>
    <span>
      {totalItems > 0
        ? `แสดง ${startIndex + 1} - ${endIndex} จากทั้งหมด ${totalItems} รายการ`
        : 'ไม่พบรายการ'}
    </span>
  </div>

  {/* Right: Page Navigation */}
  {totalPages > 1 && (
    <div className="flex items-center gap-1">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Numbers */}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`w-7 h-7 rounded-lg font-bold transition text-xs cursor-pointer ${
            currentPage === page
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )}
</div>
```

## 5. Verification Plan
- Verify pagination in `MenuManager.tsx`:
  - 10 items shown per page by default.
  - Page navigation works.
  - Changing page size dropdown to 20 or 50 updates visible rows immediately.
  - Searching resets current page to 1.
- Verify pagination in `LoyaltyManager.tsx`:
  - 10 members shown per page by default.
  - Changing page size and filtering works smoothly.
- Build verification: Run `npm run build` to confirm 0 compilation errors.
