# Daily Sales & Audit History Range Filter — Design Spec

## Overview
Update the **Sales & Audit History** page (`SalesHistory.tsx`) to filter completed orders and void logs by either **Today** (`'today'`) or **Yesterday** (`'yesterday'`).

---

## Technical Details

### 1. Component State
In `SalesHistory.tsx`:
- Add `auditDateRange`: `'today' | 'yesterday'` state (default `'today'`).

### 2. Date Range Calculation
- **Today (`'today'`)**:
  - `start`: Today at `00:00:00.000`
  - `end`: Today at `23:59:59.999`
- **Yesterday (`'yesterday'`)**:
  - `start`: Yesterday at `00:00:00.000`
  - `end`: Yesterday at `23:59:59.999`

### 3. Data Queries
- `orders` query:
  `.gte('created_at', startISO).lte('created_at', endISO)`
- `void_logs` query:
  `.gte('created_at', startISO).lte('created_at', endISO)`

### 4. UI Toggle Controls
In the header area next to "รีเฟรชข้อมูล":
- Add a 2-button Segmented Control:
  - `[ วันนี้ (Today) ]` (Active: `bg-red-600 text-white`)
  - `[ เมื่อวาน (Yesterday) ]` (Active: `bg-red-600 text-white`)

---

## Affected Files
- `components/sales/SalesHistory.tsx`

---

## Verification Plan
1. Test switching between "วันนี้" and "เมื่อวาน".
2. Verify completed orders list updates correctly.
3. Verify void logs table updates correctly.
4. Verify summary cards recalculate total sales & voids for the selected range.
