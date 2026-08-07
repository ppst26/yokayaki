# Menu Manager & Loyalty Manager Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pagination controls with page size selector (10, 20, 50) at the bottom of the table in both MenuManager and LoyaltyManager components.

**Architecture:** Add `currentPage` and `pageSize` state variables to `MenuManager.tsx` and `LoyaltyManager.tsx`. Slice filtered data arrays accordingly and render standard, responsive table footer controls with range indicator, page size dropdown, and page navigation buttons.

**Tech Stack:** Next.js 16 (App Router), React 19, Lucide React (`ChevronLeft`, `ChevronRight`).

## Global Constraints
- Page sizes: 10, 20, 50 (default 10)
- Auto reset to page 1 on search, category filter, or page size change
- Theme consistency: Lucide icons, Yokayaki red highlights (`bg-red-600`)

---

### Task 1: Add Pagination & Page Size Dropdown to MenuManager.tsx

**Files:**
- Modify: `components/MenuManager.tsx`

**Interfaces:**
- Consumes: `items` array, `filteredItems`, `searchTerm`, `filterCategory`
- Produces: `paginatedItems` array and table footer with pagination controls

- [ ] **Step 1: Import ChevronLeft and ChevronRight icons in MenuManager.tsx**

Update Lucide icon imports:
```typescript
import { Plus, Minus, Pencil, Trash2, X, Search, Loader2, CheckCircle, UtensilsCrossed, AlertTriangle, ToggleLeft, ToggleRight, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
```

- [ ] **Step 2: Add pagination states and calculation logic**

Add state hooks and sliced array computation:
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

// Reset to page 1 on filter/search/pageSize change
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, filterCategory, pageSize]);

const totalItems = filteredItems.length;
const totalPages = Math.ceil(totalItems / pageSize) || 1;
const startIndex = (currentPage - 1) * pageSize;
const endIndex = Math.min(startIndex + pageSize, totalItems);
const paginatedItems = filteredItems.slice(startIndex, endIndex);
```

- [ ] **Step 3: Update tbody to render paginatedItems and replace old count footer with new Pagination controls**

In `MenuManager.tsx`:
Change `{filteredItems.map(item => (` to `{paginatedItems.map(item => (`.

Replace old `<div className="px-5 py-3 bg-slate-50 ...">` with:

```tsx
{/* Pagination & Count Footer */}
<div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
  <div className="flex items-center gap-3">
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

  {totalPages > 1 && (
    <div className="flex items-center gap-1">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

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

- [ ] **Step 4: Commit Task 1 changes**

```powershell
git add components/MenuManager.tsx
git commit -m "feat: add pagination and page size dropdown to MenuManager"
```

---

### Task 2: Add Pagination & Page Size Dropdown to LoyaltyManager.tsx

**Files:**
- Modify: `components/LoyaltyManager.tsx`

**Interfaces:**
- Consumes: `members` array, `filteredMembers`, `searchTerm`
- Produces: `paginatedMembers` array and table footer with pagination controls

- [ ] **Step 1: Import ChevronLeft and ChevronRight icons in LoyaltyManager.tsx**

Update Lucide icon imports:
```typescript
import {
  Users, Search, ArrowLeft, Plus, Minus, Pencil, Trash2,
  DollarSign, Calendar, CheckCircle, AlertTriangle, X,
  CreditCard, Banknote, ArrowLeftRight, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
```

- [ ] **Step 2: Add pagination states and calculation logic**

Add state hooks and sliced array computation:
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

// Reset to page 1 on search or pageSize change
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, pageSize]);

const totalMembers = filteredMembers.length;
const totalPages = Math.ceil(totalMembers / pageSize) || 1;
const startIndex = (currentPage - 1) * pageSize;
const endIndex = Math.min(startIndex + pageSize, totalMembers);
const paginatedMembers = filteredMembers.slice(startIndex, endIndex);
```

- [ ] **Step 3: Update tbody to render paginatedMembers and replace old count footer**

In `LoyaltyManager.tsx`:
Change `{filteredMembers.map(member => (` to `{paginatedMembers.map(member => (`.

Replace old count footer with pagination controls:

```tsx
{/* Pagination & Count Footer */}
<div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
  <div className="flex items-center gap-3">
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
      <span>คน/หน้า</span>
    </div>
    <span className="hidden sm:inline text-slate-300">|</span>
    <span>
      {totalMembers > 0
        ? `แสดง ${startIndex + 1} - ${endIndex} จากทั้งหมด ${totalMembers} คน`
        : 'ไม่พบสมาชิก'}
    </span>
  </div>

  {totalPages > 1 && (
    <div className="flex items-center gap-1">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

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

- [ ] **Step 4: Commit Task 2 changes**

```powershell
git add components/LoyaltyManager.tsx
git commit -m "feat: add pagination and page size dropdown to LoyaltyManager"
```
