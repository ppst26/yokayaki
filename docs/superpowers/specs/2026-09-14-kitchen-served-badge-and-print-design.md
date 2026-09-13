# Kitchen Ticket — Served Badge + Print Slip

**Date:** 2026-09-14  
**Status:** Approved (design conversation)  
**Approach:** Keep active-order tickets on KDS with served badges; thermal 48mm print of pending lines only

---

## Problem

On the kitchen display (KDS), marking an item as served removes it from the card immediately because the screen only loads `order_items.status = 'pending'`. Staff lose context of what was already plated for the table, and new lines for the same table do not sit under a stable ticket history. There is also no way to print a kitchen slip for pending work.

## Goals

1. After serve (green check), the line **stays on the ticket** with a **“เสิร์ฟแล้ว”** badge instead of disappearing.
2. New order lines for the same active table/order **append at the bottom** (`created_at` ascending).
3. The ticket **remains until checkout** / order is no longer `active`.
4. Add a **Print** button in the card header (between table title and wait-time badge) that prints a **48mm thermal** slip of **pending lines only**, with clear table + datetime header.

## Non-goals

- Changing serve/void API authorization or RPC semantics
- Printing served or voided lines
- Separate “clear ticket” / archive UX beyond order becoming non-active
- Switching to 80mm or A4 as default (browser print dialog still chooses the physical printer)

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Ticket lifecycle | Stay until bill closed / order not `active` |
| Print contents | Pending only + table + time header |
| Paper | Thermal **48mm**, same family as receipt / customer QR print |
| Architecture | Query `pending` + `served` for active orders; update DB status; UI badge (Approach 1) |

---

## Behavior

### Data load (`KitchenScreen`)

- Select `order_items` where:
  - `status IN ('pending', 'served')`
  - parent `orders.status = 'active'`
- Order by `created_at` ascending
- Group into table/order cards as today
- Exclude `voided` from the ticket list

### Serve one item

- Call existing `PATCH /api/kitchen/items/[id]`
- Optimistic UI: set that item’s `status` to `served` (do **not** remove from local list)
- On failure: refetch
- Served row: show badge **เสิร์ฟแล้ว**; disable serve check and void for that row

### Serve all for table

- Call existing batch serve API with **pending item ids only**
- Same optimistic update: pending → served badges
- If no pending items remain, disable “เสิร์ฟทั้งหมด” (and print)

### Wait timer

- Compute from the **oldest pending** `created_at`
- If no pending left: show a calm “เสิร์ฟครบ” style state (no red blink)

### Realtime

- Keep existing `order_items` / related subscriptions with debounce/refetch patterns already used for PERF
- Insert of new `pending` → appears at bottom of that card after refetch/merge
- Update to `served` from another device → badge appears
- When order leaves `active` (checkout) → card drops off on next fetch

### Print

- Header control: Printer icon + short label **พิมพ์**, placed between table label and wait badge
- Enabled only when the card has ≥1 `pending` line
- Print payload:
  - Table number
  - Printed-at datetime (store-local / browser local is fine; format clear Thai/numeric)
  - Each pending line: `×qty` name, optional notes
  - Footer: count of pending lines
- Implementation pattern aligned with customer QR / receipt:
  - Hidden (off-screen) print root `#kitchen-ticket-print` **or** per-card print root with a single active target
  - `document.documentElement` class e.g. `print-kitchen-ticket`
  - `@media print` in `app/globals.css`: `@page size: 48mm auto`; show only the kitchen ticket target; do not break receipt / QR print modes
  - `window.print()` + `afterprint` cleanup

---

## UI sketch (card header)

```
[ โต๊ะ N · รวม X รายการ ]  [ พิมพ์ ]  [ ⏱ wait / เสร็จครบ ]
────────────────────────────────────
 pending row ……… [void] [✓]
 served row  ……… [เสิร์ฟแล้ว]
 pending row ……… [void] [✓]   ← newer lines lower
────────────────────────────────────
[ เสิร์ฟทั้งหมดของโต๊ะ N ]   ← pending only
```

---

## Files to touch

| File | Change |
|------|--------|
| `components/kitchen/KitchenScreen.tsx` | Fetch pending+served; serve handlers keep rows; grouping/sort |
| `components/kitchen/KitchenOrderCard.tsx` | Served badge; print button; serve-all filters pending; print root |
| `app/globals.css` | `print-kitchen-ticket` + `#kitchen-ticket-print` (or agreed id) 48mm rules |

Optional: small helper for print class lifecycle if duplicated from QR modal.

**Out of scope for this change:** `app/api/kitchen/*` unless a bug is found (reuse as-is).

---

## Edge cases

1. All lines served, order still active → card stays, print + serve-all disabled, timer calm.
2. Partial void → voided lines disappear from ticket; other lines unchanged.
3. Refresh while mixed pending/served → both still visible from DB.
4. Concurrent serve from two devices → refetch reconciles badges.
5. Print with zero pending → button disabled (no empty slip).
6. Receipt/QR print must remain unaffected when kitchen print class is not set.

---

## Success criteria

- [ ] Serving an item shows **เสิร์ฟแล้ว** and does not remove the row
- [ ] New items for the same active order appear below existing lines
- [ ] Ticket disappears only when the order is no longer active
- [ ] Print button in marked header position prints 48mm pending-only slip with table + time
- [ ] Existing void + serve APIs still work; checkout still blocked by pending kitchen items as today

---

## Testing notes

- Manual: open KDS → order items → serve one → badge → order more → appears below → print → only pending on slip → checkout → card gone
- Manual: confirm receipt print and customer QR print still isolate correctly
- No new DB migration required for this feature
