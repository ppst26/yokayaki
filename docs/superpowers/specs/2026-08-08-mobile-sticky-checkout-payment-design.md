# Mobile Sticky & Fullwidth Checkout Payment Card Design

## Overview
This design updates the `PaymentCard` component in `CheckoutScreen` to be sticky and full-width on mobile screens (`< lg`), providing an effortless payment experience where staff can instantly view, input cash, click quick amounts, generate PromptPay QR, or confirm payment without having to scroll to the bottom of the bill.

---

## Detailed Specifications

### 1. `PaymentCard.tsx` Container Styling
- **Mobile (`< lg`)**:
  - `fixed bottom-0 left-0 right-0 z-40 w-full`
  - `bg-white dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800`
  - `rounded-t-3xl rounded-b-none`
  - `shadow-[0_-8px_30px_rgba(0,0,0,0.15)]`
  - Padding: `p-4 sm:p-5 space-y-3 sm:space-y-4`
- **Desktop (`≥ lg`)**:
  - `relative bottom-auto left-auto right-auto z-auto w-full`
  - `rounded-2xl shadow-xs p-5 space-y-4`
  - `border border-slate-200 dark:border-neutral-800`

### 2. Main Page Scroll Padding (`CheckoutScreen.tsx`)
- Container padding at bottom: `pb-80 lg:pb-8` to ensure all order items, CRM member cards, and coupon sections remain fully scrollable and visible above the fixed bottom sheet on mobile.

---

## Files to Modify
- [PaymentCard.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/checkout/PaymentCard.tsx)
- [CheckoutScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/checkout/CheckoutScreen.tsx)
