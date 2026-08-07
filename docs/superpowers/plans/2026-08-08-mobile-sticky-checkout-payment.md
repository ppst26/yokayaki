# Mobile Sticky & Fullwidth Checkout Payment Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the payment input card on the Checkout Screen into a sticky full-width bottom sheet on mobile devices (`< lg`) so staff can enter cash and complete transactions without scrolling to the bottom.

**Architecture:** Modify `PaymentCard.tsx` root classes with Tailwind responsive positioning (`fixed lg:relative bottom-0 left-0 right-0 z-40 lg:z-auto w-full rounded-t-3xl lg:rounded-2xl rounded-b-none lg:rounded-b-2xl border-t lg:border shadow-[0_-8px_30px_rgba(0,0,0,0.15)] lg:shadow-xs`). Update `CheckoutScreen.tsx` main scroll container padding to `pb-80 lg:pb-8` to ensure scrollable content isn't covered by the fixed bar.

**Tech Stack:** React 19, Next.js 16, TailwindCSS 4, Lucide React.

## Global Constraints

- Full width & sticky on mobile (`< lg`)
- Natural card layout inside right column on desktop (`≥ lg`)
- Adequate bottom padding on main container (`pb-80 lg:pb-8`) to prevent content clipping

---

### Task 1: Update PaymentCard Responsive Styling

**Files:**
- Modify: `components/checkout/PaymentCard.tsx:30-143`

**Interfaces:**
- Consumes: `PaymentCardProps`
- Produces: Responsive `PaymentCard` component with mobile fixed bottom sheet styling.

- [ ] **Step 1: Update `PaymentCard.tsx` root container classes**

Modify `components/checkout/PaymentCard.tsx` line 31 from `<Card className="p-5 space-y-4">` (or `<Card>`) to:

```tsx
    <Card className="fixed lg:relative bottom-0 left-0 right-0 z-40 lg:z-auto w-full rounded-t-3xl lg:rounded-2xl rounded-b-none lg:rounded-b-2xl border-t lg:border border-slate-200 dark:border-neutral-800 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] lg:shadow-xs p-4 sm:p-5 bg-white dark:bg-neutral-900 space-y-3 sm:space-y-4 transition-all">
```

- [ ] **Step 2: Verify `PaymentCard.tsx` type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

---

### Task 2: Update CheckoutScreen Main Container Padding

**Files:**
- Modify: `components/checkout/CheckoutScreen.tsx:454`

**Interfaces:**
- Consumes: `CheckoutScreenProps`
- Behavior: Ensure main div has `pb-80 lg:pb-8` bottom padding to accommodate fixed mobile bottom bar.

- [ ] **Step 1: Update `CheckoutScreen.tsx` container padding**

In `components/checkout/CheckoutScreen.tsx` line 454:

Change:
`<div className="w-full text-slate-800 dark:text-neutral-100 font-sans pb-64 lg:pb-8">`
To:
`<div className="w-full text-slate-800 dark:text-neutral-100 font-sans pb-80 lg:pb-8">`

- [ ] **Step 2: Verify type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

---

### Task 3: Build Verification

- [ ] **Step 1: Build Next.js project**

Run: `pnpm run build`
Expected: Build succeeds with 0 errors.
