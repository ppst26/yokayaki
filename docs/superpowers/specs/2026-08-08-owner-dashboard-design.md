# Owner Dashboard Analytics Redesign - Design Specification

**Date:** 2026-08-08  
**Status:** Approved  
**Target File:** `components/dashboard/OwnerDashboard.tsx`  

---

## 1. Overview & Business Goal

Redesign the `OwnerDashboard` component to provide a comprehensive, executive-level business overview for restaurant owners. The design follows a modern multi-widget dashboard layout featuring real-time metrics, promotion insights, CRM performance, sales trend charts, and top-selling menu items.

The dashboard will be fully reactive to a global Date Range Filter (Today, Yesterday, This Week, This Month, 3 Months, 6 Months, Custom Datepicker).

---

## 2. Core Layout & Widget Mapping

### 📅 Global Date Filter Bar (Top Header)
- **Presets**: `today` (วันนี้), `yesterday` (เมื่อวาน), `this_week` (สัปดาห์นี้), `this_month` (เดือนนี้), `3_months` (3 เดือน), `6_months` (6 เดือน), `custom` (ช่วงวันที่กำหนดเอง)
- **Custom Inputs**: Standard HTML date pickers for `startDate` and `endDate` when `custom` option is selected.
- **Scope**: All 6 dashboard widgets dynamically update their queries and aggregated statistics based on the selected date range.

---

### 💳 Section 1: Top 3 Progress Cards
1. **Card 1: ยอดขายรวม (Total Revenue)**
   - Sum of `payments.net_amount` within selected date range.
   - Includes progress bar and percentage change comparison (e.g. vs previous period).
2. **Card 2: ยอดบิลทั้งหมด (Total Closed Bills)**
   - Count of `payments` completed within selected date range.
   - Includes progress bar representing bill volume.
3. **Card 3: ยอดออเดอร์ทั้งหมด (Total Menu Items Sold)**
   - Sum of `order_items.quantity` for non-voided items ordered within selected date range.
   - Includes progress bar representing item throughput.

---

### 🎯 Section 2: Quick Business Spotlight (Top Right)
1. **Card A: โปรโมชั่นยอดฮิต (Top Promotion)**
   - Most frequently applied promotion in `payment_promotions` within the date range.
   - Displays promotion name, total usage count, and total discount value granted.
2. **Card B: สัดส่วนวิธีชำระเงิน (Payment Method Breakdown)**
   - Percentage distribution of payment methods (`promptpay`, `cash`, `mixed`).
   - Displays visual percentage progress bars for PromptPay vs Cash.

---

### 📊 Section 3: Sales Trend Bar Chart (Middle Left)
- **Widget**: Visual Bar Chart displaying daily or hourly revenue breakdown over the selected date range.
- **Interactivity**: Interactive Hover Tooltip displaying exact sales amount (฿) and total bill count for each bar segment.
- **Styling**: Sleek red/rose gradient bars adhering to Yokayaki design tokens (Light/Dark mode compatible).

---

### 💎 Section 4: Business Data 3 Core KPIs (Middle Center)
1. **KPI 1: ลูกค้าสมาชิก CRM (CRM Loyalty Members)**
   - Total count of registered loyalty members (`loyalty_members`) and new members joined within period.
2. **KPI 2: โปรโมชั่นที่เปิดใช้งานอยู่ (Active Promotions)**
   - Total count of active promotions (`promotions.is_active = true`) currently available.
3. **KPI 3: แต้มสะสมที่ใช้ทั้งหมด (Total Loyalty Points Redeemed)**
   - Sum of `payments.points_redeemed` within selected date range.

---

### 🧾 Section 5: Recent Activity & Promo Discounts (Bottom Left)
- **Summary**: Total discount amount granted across all promotions (`payments.discount_amount`).
- **Activity Stream**: List of recent completed bills with order ID (ORD-XX), table number, timestamp, net amount, and promo badge status.

---

### 🏆 Section 6: Top 8 Best-Selling Dishes (Bottom Right)
- **Ranking**: Top 8 menu items sorted by total quantity sold.
- **Visuals**: Food photo thumbnail (`menu_items.image_url`), dish name, quantity sold (`X จาน`), total sales revenue, and horizontal percentage progress bar comparing relative popularity against top item.

---

## 3. Data Flow & Technical Architecture

- **Data Source**: Supabase JS Client querying `payments`, `order_items`, `promotions`, `payment_promotions`, `loyalty_members`, and `menu_items`.
- **Filtering Logic**:
  ```ts
  startDate = calculateStartDate(presetFilter, customStartDate);
  endDate = calculateEndDate(presetFilter, customEndDate);
  ```
- **State Management**:
  - `datePreset`: `'today' | 'yesterday' | 'this_week' | 'this_month' | '3_months' | '6_months' | 'custom'`
  - `customStartDate`: `string` (YYYY-MM-DD)
  - `customEndDate`: `string` (YYYY-MM-DD)
  - `analyticsData`: Structured state object holding all aggregated metrics.

---

## 4. Verification Plan

1. **Build & Type Check**: Execute `pnpm build` to verify clean TypeScript compilation and Next.js page generation.
2. **Date Filter Verification**: Test switching between all 7 date range options to verify state calculation and accurate query filtering.
3. **Responsive & Theme Verification**: Confirm UI responsiveness on desktop & mobile in both Dark and Light modes.
