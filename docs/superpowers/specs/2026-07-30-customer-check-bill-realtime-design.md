# Design Specification: Real-Time Customer Check Bill & Table Status Sync

**Date:** 2026-07-30  
**Status:** Approved by User  
**Target Files:**
- `app/customer/[session_id]/page.tsx` (Customer Ordering Portal)
- `components/TableMap.tsx` (POS Floor Map)

---

## 1. Executive Summary

This feature allows restaurant customers to request their bill directly from their smartphone via the Customer QR Portal. Clicking the **"เรียกเช็คบิล / ชำระเงิน"** (Request Bill) button updates the table's status in Supabase to `'checking_out'`. 

Via **Supabase Realtime WebSocket subscriptions**, this update immediately (under 100ms) turns the corresponding table card on the Staff POS Floor Map (`TableMap.tsx`) **RED** (รอเช็คบิล / Checking Out) without needing page refreshes.

---

## 2. Customer UI Design (`Ordered History` Tab)

Positioned at the bottom of the **"รายการที่สั่งแล้ว" (Ordered History)** tab, inside/below the accumulated bill summary card:

```
┌──────────────────────────────────────────────────────────┐
│  ยอดรวมทั้งสิ้น                                            │
│  9 รายการ (ไม่รวมรายการที่ยกเลิก)                ฿1,140  │
├──────────────────────────────────────────────────────────┤
│  [ 🔔 เรียกเช็คบิล / ชำระเงิน ]                           │
│  (Primary Red Action Button)                             │
└──────────────────────────────────────────────────────────┘
```

### State Behavior:

1. **State A: Normal (`status === 'occupied'`)**
   - Renders primary action button: **"🔔 เรียกเช็คบิล / ชำระเงิน"**
   - Clicking opens confirmation modal: *"ยืนยันเรียกพนักงานมาเช็คบิล โต๊ะ {tableId} (ยอดรวม ฿{totalAmt})?"*

2. **State B: Requested (`status === 'checking_out'`)**
   - Renders an active warning banner:  
     **"⏳ แจ้งเรียกพนักงานเช็คบิลแล้ว"** with a subtext *"พนักงานกำลังเดินทางมาที่โต๊ะของคุณ"* and pulsing status icon.
   - Shows option button: *"ยกเลิกการเรียกเช็คบิล"* (resets table status back to `'occupied'`).

---

## 3. Real-Time Architecture & Supabase Data Flow

```
[ Customer Smartphone ]
       │
       │ (1) User clicks "เรียกเช็คบิล" & confirms
       ▼
[ Supabase DB: tables.status = 'checking_out' ]
       │
       │ (2) Realtime WebSocket Broadcast (Postgres WAL change < 100ms)
       ├─────────────────────────────────────────┐
       ▼                                         ▼
[ Staff POS: TableMap.tsx ]           [ Customer Portal ]
   Table Card turns RED 🔴               Banner updates to ⏳
   "รอเช็คบิล (Checking Out)"            "แจ้งเรียกพนักงานเช็คบิลแล้ว"
```

### 1. Database Table (`tables`):
- `id`: integer (e.g. `1`)
- `status`: `'vacant' | 'occupied' | 'checking_out'`

### 2. Supabase Realtime Channels:
- **`realtime:tables` channel** listening to `UPDATE` events on public table `tables`.
- When `payload.new.status === 'checking_out'`, `TableMap.tsx` updates state instantly, rendering the red checking out table card.
- Customer Portal listens to `tables` updates for `table_id` to stay synchronized if staff clears or resets the table.

---

## 4. Verification Plan

1. **Unit/Component Verification:** Check button state transitions (`occupied` ↔ `checking_out`).
2. **Realtime Verification:** Open Staff POS (`/`) and Customer Portal (`/customer/[session_id]`) side-by-side. Click "เรียกเช็คบิล" on Customer Portal and verify POS Table card turns **RED** instantly without page reload.
3. **Cancellation Verification:** Click "ยกเลิกการเรียกเช็คบิล" and verify table card turns back to **Yellow (Occupied)** on POS.
