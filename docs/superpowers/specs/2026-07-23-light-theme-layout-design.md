# Design Spec: Light Theme & CHILI POS-Inspired Layout Redesign

**Date**: 2026-07-23  
**Status**: Draft  
**Target System**: Yokayaki POS Web Application  

---

## 1. Executive Summary & Goal

Redesign the user interface of **Yokayaki POS** from the current dark/stone scheme to a clean, modern **Light Theme**, adopting the 3-column layout structure inspired by the CHILI POS design sample.

Key directives:
- **Background**: `bg-gray-100` (`#f3f4f6`)
- **Primary Surface**: Crisp White (`bg-white`), `rounded-2xl`, soft shadow (`shadow-sm`)
- **Secondary / Accent Color**: **YokaYaki Red** (`bg-red-600`, `hover:bg-red-700`, `text-red-600`, `ring-red-500`)
- **Data Compliance**: 100% adherence to existing Supabase database schema (no added/invented schema fields).

---

## 2. Design System & Style Tokens

| Element | Style / Tailwind Class | Description |
|---------|-----------------------|-------------|
| **Page Background** | `bg-gray-100` | Soft light gray backdrop for high contrast against white containers |
| **Card / Panel Background** | `bg-white border border-slate-200/70 shadow-sm rounded-2xl` | Elevated white surface with subtle border and rounded corners |
| **Primary Accent (Buttons/CTA)** | `bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl` | YokaYaki brand red for action buttons and high-priority targets |
| **Secondary Accent (Outline/Links)** | `text-red-600 border border-red-200 bg-red-50 hover:bg-red-100` | Subtle red background for secondary toggles/badges |
| **Heading Text** | `text-slate-800 font-bold` | High-contrast dark charcoal for titles and key labels |
| **Body Text** | `text-slate-600 font-medium` | Medium gray for general content and item descriptions |
| **Subtext / Muted** | `text-slate-400 font-normal` | Light gray for captions, timestamps, and secondary info |
| **Status - Vacant / Inactive** | `bg-slate-100 text-slate-700 border-slate-200` | Neutral slate tag |
| **Status - Occupied / Pending** | `bg-amber-100 text-amber-800 border-amber-300` | Warm amber warning badge |
| **Status - Served / Active** | `bg-emerald-100 text-emerald-800 border-emerald-300` | Vibrant green success badge |
| **Status - Voided / Danger** | `bg-rose-100 text-rose-800 border-rose-300` | Soft rose badge for voided items |

---

## 3. Architecture & Layout Specification

### 3.1 App Layout Structure (`components/TableMap.tsx`)
The application frame adopts a clean sidebar navigation + main stage layout:
1. **Left Navigation Sidebar**:
   - Brand Emblem & Name ("Yokayaki POS") in YokaYaki Red.
   - Dynamic Navigation Links (Floor Map, POS Order, Kitchen KDS, Stock, Menu, Promo, Loyalty, Sales History, Dashboard) based on Employee Role (Owner vs Staff).
   - Bottom Section: Staff badge (Name & Role) and Logout button.
2. **Main Stage**:
   - Full height workspace displaying the selected tab content on a `bg-gray-100` canvas.

### 3.2 POS Order Screen (`components/POSOrderScreen.tsx`)
Redesigned to match CHILI POS layout:
- **Top Header**:
  - Search input box (`Search menu...`) with search icon and quick reset button.
  - Category Pills (Horizontal scroll bar): "ทั้งหมด" + dynamic categories (e.g., ยากิโทริ, เครื่องดื่ม, ของทานเล่น). Active pill highlighted with `bg-red-600 text-white shadow-sm`.
- **Main Section (Menu Cards Grid)**:
  - Grid of menu item cards (`bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 hover:shadow-md`).
  - Item details: Name, price formatted in `text-red-600 font-bold text-lg`, stock count tag.
  - Quantity controls (`- 1 +` or `+ เพิ่มลงตะกร้า` button).
- **Bottom Active Table Bar**:
  - Quick status chips of active tables (e.g. `T1 (4 items → ครัว)`, `T3 (กำลังทาน)`) for single-tap switching between table orders.
- **Right Sidebar (Persistent Cart & Summary Panel)**:
  - Header: Selected Table number & dining type.
  - Cart Item List: Items currently in cart + ordered items (distinguished by status).
  - Notes button & edit popup for special instructions.
  - Summary section: Subtotal, promotions, net total in bold dark text.
  - Quick action buttons: "สร้าง QR Code ให้ลูกค้า", "ชำระเงิน / ไปหน้าสั่งซื้อ".
  - Main Red CTA Button: `bg-red-600 text-white font-bold` for submitting orders.

### 3.3 Checkout Screen (`components/CheckoutScreen.tsx`)
- White surface container on `bg-gray-100`.
- Member search bar & point redemption calculation.
- Payment method tabs (Cash, PromptPay QR, Mixed) with clear icons and red highlight state.
- Thermal receipt preview in white paper format.

### 3.4 KDS Kitchen Screen (`components/KitchenScreen.tsx`)
- Orders displayed as white ticket cards with clear wait timers (amber/red badges for overdue).
- "เสิร์ฟแล้ว" (Served) button styled in YokaYaki Red / Emerald green.

### 3.5 Management Screens & PIN Pad
- `StockManager`, `MenuManager`, `PromoManager`, `LoyaltyManager`, `SalesHistory`, `OwnerDashboard`:
  - Standardized to Light Theme with white tables, clean borders, red action buttons, and slate headers.
- `PinPad`:
  - White floating card container on gray backdrop with red dot indicators for entered PIN digits.

---

## 4. Database & Data Model Integrity

All components strictly use existing table structures:
- `employees`: `id`, `name`, `role`, `pin_hash`
- `tables`: `id`, `status` (`vacant` | `occupied` | `checking_out`)
- `menu_items`: `id`, `name`, `price`, `stock`, `category`, `is_happy_hour`, `happy_hour_price`, `is_stock_tracked`
- `orders`: `id`, `table_id`, `qr_session_id`, `status`
- `order_items`: `id`, `order_id`, `menu_item_id`, `quantity`, `unit_price`, `status`, `notes`
- `qr_sessions`, `loyalty_members`, `payments`, `promotions`, `payment_promotions`, `stock_logs`, `item_ingredients`, `points_logs`

---

## 5. Verification Plan

1. **Visual & Layout Audit**:
   - Verify all views render seamlessly on `bg-gray-100` background.
   - Confirm primary cards use `bg-white` with crisp typography and red CTA buttons.
2. **Functional Verification**:
   - Test full POS flow: Table selection -> POS Order -> Cart addition -> Order submission -> KDS Kitchen view -> Checkout -> Receipt.
   - Test Owner management screens in Light Theme.
