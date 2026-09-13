# Kitchen Served Badge + Print Slip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep served lines on active kitchen tickets with a badge, append new lines at the bottom, and print pending-only 48mm slips from the card header.

**Architecture:** Load `pending`+`served` for `orders.status=active`. Optimistic serve updates status in local state (no row remove). Single shared `#kitchen-ticket-print` root + `print-kitchen-ticket` html class mirrors QR/receipt print isolation.

**Tech Stack:** Next.js App Router client components, Supabase realtime, `window.print()` + `app/globals.css` `@media print`

**Spec:** `docs/superpowers/specs/2026-09-14-kitchen-served-badge-and-print-design.md`

## Global Constraints

- Do not change kitchen serve/void API contracts
- Thermal slip width 48mm; print pending only
- Ticket stays until order not active
- Receipt and customer-QR print modes must remain isolated

---

### Task 1: KitchenScreen data + serve keep rows + print root

**Files:**
- Modify: `components/kitchen/KitchenScreen.tsx`

- [ ] Fetch `.in('status', ['pending', 'served'])`
- [ ] `markItemAsServed` / `markAllTableItemsAsServed` set `status: 'served'` instead of filtering out
- [ ] Group items sorted by `created_at` asc; expose print payload state + off-screen `#kitchen-ticket-print`
- [ ] Pass `onPrintTicket(group)` to cards
- [ ] Commit

### Task 2: KitchenOrderCard badge + print button + serve-all pending

**Files:**
- Modify: `components/kitchen/KitchenOrderCard.tsx`

- [ ] Served rows: badge เสิร์ฟแล้ว; hide void/serve actions
- [ ] Wait timer from oldest pending; calm “เสิร์ฟครบ” when none
- [ ] Print button between title and timer; disabled when no pending
- [ ] Serve-all only pending ids
- [ ] Commit

### Task 3: globals.css kitchen print mode

**Files:**
- Modify: `app/globals.css`

- [ ] Gate receipt with `:not(.print-kitchen-ticket)` alongside existing QR gate
- [ ] Add `html.print-kitchen-ticket #kitchen-ticket-print` 48mm rules
- [ ] Commit

### Task 4: Manual verify

- [ ] Serve one → badge; new order → bottom; print pending only; checkout clears card; receipt/QR print still OK
