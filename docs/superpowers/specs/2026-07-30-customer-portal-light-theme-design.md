# Design Specification: Customer QR Portal Light Theme & Bottom Navigation

**Date:** 2026-07-30  
**Status:** Approved by User  
**Target File:** `app/customer/[session_id]/page.tsx`

---

## 1. Executive Summary

The Customer QR Ordering Portal (`/customer/[session_id]`) is being upgraded from a dark-themed single-scroll screen into a modern, mobile-first **Light Theme interface featuring a 4-Tab Bottom Navigation Bar**. 

This redesign aligns the visual aesthetic with the main POS screen (`bg-slate-50`, clean white cards, Yokayaki red/amber accents) while significantly improving user experience (UX) for restaurant diners ordering on smartphones.

---

## 2. Visual & Theme System Design (Light Theme)

### Color Tokens & Styling Rules
- **Page Background:** `bg-slate-50 min-h-screen text-slate-900`
- **Container / Cards:** `bg-white border border-slate-200 shadow-xs rounded-2xl`
- **Brand Colors:**
  - Primary Accent: Yokayaki Red (`bg-red-600`, `text-red-600`, `hover:bg-red-700`)
  - Sub-Accent: Light Red Fill (`bg-red-50 text-red-600 border-red-200`)
  - Secondary/Muted Text: `text-slate-500` / `text-slate-400`
- **Bottom Navigation Bar:**
  - `fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40`
  - Active Tab Icon & Text: `text-red-600 font-bold`
  - Inactive Tab Icon & Text: `text-slate-400 font-medium hover:text-slate-600`

---

## 3. Architecture & Tab Navigation Breakdown

The customer ordering portal will maintain a single page component with active tab state (`activeTab`: `'home' | 'order' | 'ordered' | 'promotions'`). State for cart items, table session data, menu items, and order history will remain preserved in memory across tab switches.

```
┌──────────────────────────────────────────────────────────┐
│                   Top Sticky Header                      │
│             (Table No. & Quick Session Status)           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                     Tab Content Area                     │
│    (Home / Order Food / Ordered History / Promotions)    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│           Floating Cart Summary Bar (When active)        │
├──────────────────────────────────────────────────────────┤
│   [ 🏠 Home ]  [ 🍱 Order ]  [ 📋 Ordered ]  [ 🏷️ Promos ]│
│                   Fixed Bottom Nav Bar                   │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Specification of the 4 Navigation Tabs

### Tab 1: 🏠 หน้าหลัก (Home)
- **Hero Table Banner:**
  - Displays Table Number (e.g. `โต๊ะ 1`) with Yokayaki emblem.
  - Active QR Session status indicator & valid time.
- **Promotion Carousel / Highlight Cards:**
  - Banner cards featuring top active promotions.
  - Clicking a promotion banner switches to the **Promotions** tab or opens its details.
- **Active Order Status Summary:**
  - Quick summary card showing active kitchen orders for this table (e.g., `"มี 3 รายการกำลังปรุงในครัว"`).
- **Primary CTA:**
  - Large call-to-action button: `"เลือกสั่งอาหารทันที 🍲"` which navigates to the **Order** tab.

---

### Tab 2: 🍱 สั่งอาหาร (Order Food)
- **Category Filter Chips:**
  - Horizontal scrolling bar with categories (`ทั้งหมด`, `เครื่องดื่ม`, `ย่าง`, `จานหลัก`, `ซาชิมิ` etc.).
- **Menu Grid:**
  - 2-column mobile layout.
  - Cards feature menu thumbnail (`image_url` or SVG placeholder), dish name, price in THB, remaining stock badge (e.g., `"เหลือ 3 จาน"` or `"SOLD OUT"`).
  - Quantity controls (`-` / `+`) and Special Note trigger button.
- **Floating Cart Summary Bar:**
  - Positioned above the Bottom Nav Bar whenever `cart.length > 0`.
  - Shows item count and net total (`"X รายการ | ฿XXX.00"`).
  - Clicking opens the slide-up Cart Review Drawer to confirm and place order (`customer_place_order_item` RPC).

---

### Tab 3: 📋 รายการที่สั่งแล้ว (Ordered History)
- **Real-time Order Status Feed:**
  - Real-time updates for table orders.
  - Itemized list grouped or tagged by kitchen status:
    - 🟡 **กำลังปรุง** (`pending`): Yellow/amber badge + pulsing wait icon.
    - 🟢 **เสิร์ฟแล้ว** (`served`): Green check badge.
    - 🔴 **ยกเลิกแล้ว** (`voided`): Red badge + void reason if logged.
- **Bill Summary Footer:**
  - Total items count & total accumulated price for the table.

---

### Tab 4: 🏷️ โปรโมชั่น (Promotions)
- **Promotions Feed:**
  - Fetches active promotions (`is_active = true`) from the `promotions` table.
- **Promotion Card Design:**
  - **Image:** Promotion cover image (`image_url`) or category food graphic.
  - **Title & Badge:** Promotion name and type badge (`ลด %`, `คูปองลดเงิน`, `ซื้อ X แถม Y`).
  - **Short Description:** Dynamically formatted description string:
    - Percentage: `"รับส่วนลด X% เมื่อสั่งขั้นต่ำ ฿YYY"`
    - Fixed Amount: `"รับส่วนลดมูลค่า ฿X เมื่อสั่งครบ ฿YYY"`
    - Buy X Get Y: `"ซื้อ X แถมฟรี Y (รายการที่ร่วมรายการ)"`
  - **Time Range / Happy Hour:** Display start/end time window if specified (e.g., `"14:00 - 17:00 น."`).

---

## 5. Verification Plan

1. **Visual Testing:** Verify Light Theme colors (`bg-slate-50`, `bg-white`, `border-slate-200`) match POS design system.
2. **Navigation Testing:** Ensure seamless tab switching between Home, Order, Ordered, and Promotions tabs on mobile resolution.
3. **Cart State Persistence:** Verify cart selection is maintained when switching tabs before checkout.
4. **Realtime Updates:** Test real-time order status changes (`pending` → `served`) in Tab 3.
5. **Mobile Responsiveness:** Validate on mobile viewport (LAN device or browser mobile view).
