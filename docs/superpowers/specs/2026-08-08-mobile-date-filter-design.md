# 📅 Design Spec: Mobile Date Filter Clean UI Redesign

**Date:** 2026-08-08  
**Target File:** `components/dashboard/DateFilterBar.tsx`

---

## 🎯 Problem Statement
Currently, the date filter bar (`DateFilterBar.tsx`) renders 7 pill buttons ("วันนี้", "เมื่อวาน", "สัปดาห์นี้", "เดือนนี้", "3 เดือน", "6 เดือน", "กำหนดเอง") using flex-wrap. On mobile devices (<640px), these buttons break into 3-4 vertical rows, taking up excessive vertical screen space before the user can see any dashboard KPI cards or charts.

---

## 💡 Proposed Solution
Implement a responsive date filter bar layout:
1. **Mobile Layout (`<640px` / `sm:hidden`)**:
   - Collapse the 7 preset buttons into a single `<CustomSelect>` dropdown component (e.g. `[ 📅 วันนี้ ▾ ]`).
   - When "กำหนดเอง" (`custom`) is selected, reveal a compact, modern date range picker inline below the dropdown (`เริ่ม` / `ถึง` inputs).
2. **Desktop Layout (`≥640px` / `hidden sm:flex`)**:
   - Maintain the horizontal pill buttons row for fast 1-click preset switching on desktop.

---

## 🛠️ Detailed Component Changes

### 1. `components/dashboard/DateFilterBar.tsx`
- **Imports**:
  - Add `CustomSelect` from `@/components/ui/select`.
- **Mobile Render Container (`block sm:hidden`)**:
  - Single row containing `<CustomSelect>` initialized with options:
    - `วันนี้` (`today`)
    - `เมื่อวาน` (`yesterday`)
    - `สัปดาห์นี้` (`this_week`)
    - `เดือนนี้` (`this_month`)
    - `3 เดือน` (`3_months`)
    - `6 เดือน` (`6_months`)
    - `กำหนดเอง` (`custom`)
  - When `datePreset === 'custom'`, render a clean inline date picker card with styled `<input type="date">` fields for start and end dates.
- **Desktop Render Container (`hidden sm:flex`)**:
  - Retain existing pill button row and inline custom date inputs.

---

## 🧪 Verification Plan
1. Test on mobile screen sizes (< 640px) using Browser Subagent or browser dev tools.
2. Verify that presets switch correctly and update dashboard data.
3. Select "กำหนดเอง" and verify date range input behavior.
4. Verify desktop view (≥ 640px) remains clean and functional.
